import { Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api';
import type { HubConnection } from '@microsoft/signalr';
import type { InboxNotification } from './inbox-notification';
import type { PresenceUpdate } from './user-presence';

@Injectable({ providedIn: 'root' })
export class InboxRealtime {
  private connection?: HubConnection;
  private token = '';
  private connected = false;
  private presenceGeneration = 0;
  private presenceQueue = Promise.resolve();
  private watcher?: {
    userId: string;
    token: string;
    revision: number;
    received: (state: PresenceUpdate | null) => void;
  };

  watchPresence(
    userId: string,
    token: string,
    received: (state: PresenceUpdate | null) => void,
  ): () => void {
    const watcher = { userId, token, received, revision: -1 };
    this.watcher = watcher;
    received(null);
    this.syncPresence();
    return () => {
      if (this.watcher !== watcher) return;
      this.watcher = undefined;
      this.syncPresence();
    };
  }

  private receivePresence(state: PresenceUpdate): void {
    const watcher = this.watcher;
    if (!this.connected || watcher?.token !== this.token || watcher.userId !== state.userID) return;
    if (state.revision < watcher.revision) return;
    watcher.revision = state.revision;
    watcher.received(state);
  }

  private presenceStatus(connected: boolean): void {
    this.connected = connected;
    this.presenceGeneration++;
    // Uma nova conexao pode pertencer a outra instancia da API, com novas revisoes.
    this.presenceQueue = Promise.resolve();
    if (this.watcher) {
      this.watcher.revision = -1;
      this.watcher.received(null);
    }
    if (connected) this.syncPresence();
  }

  private syncPresence(): void {
    const connection = this.connection;
    const generation = this.presenceGeneration;
    if (!connection || !this.connected) return;
    this.presenceQueue = this.presenceQueue.then(async () => {
      if (generation !== this.presenceGeneration || !this.connected) return;
      const watcher = this.watcher;
      try {
        if (!watcher || watcher.token !== this.token) {
          await connection.invoke('UnwatchProfilePresence');
          return;
        }
        const state = await connection.invoke<PresenceUpdate>(
          'WatchProfilePresence',
          watcher.userId,
        );
        if (generation === this.presenceGeneration && this.watcher === watcher)
          this.receivePresence(state);
      } catch {
        if (generation === this.presenceGeneration && this.watcher === watcher)
          watcher?.received(null);
      }
    });
  }

  connect(
    token: string,
    received: (items: InboxNotification[]) => void,
    status: (online: boolean) => void,
  ): () => void {
    let stopped = false;
    let connection: HubConnection | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    this.token = token;
    const reportStatus = (online: boolean) => {
      if (stopped) return;
      this.presenceStatus(online);
      status(online);
    };
    const retry = () => {
      if (stopped) return;
      reportStatus(false);
      clearTimeout(timer);
      timer = setTimeout(() => void start(), Math.min(30000, 2000 * 2 ** Math.min(failures++, 4)));
    };
    const snapshot = async () => {
      const items = await connection!.invoke<InboxNotification[]>('GetNotifications');
      if (!stopped) received(items);
    };
    const start = async () => {
      try {
        if (!connection) {
          const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
          if (stopped) return;
          connection = new HubConnectionBuilder()
            .withUrl(API_BASE_URL + '/hubs/notifications', { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.None)
            .build();
          this.connection = connection;
          connection.on('PresenceChanged', (state: PresenceUpdate) => {
            if (!stopped) this.receivePresence(state);
          });
          connection.on('Notifications', (items: InboxNotification[]) => {
            if (!stopped) received(items);
          });
          connection.onreconnecting(() => {
            reportStatus(false);
          });
          connection.onreconnected(() => {
            if (stopped) return;
            reportStatus(true);
            void snapshot().catch(() => status(false));
          });
          connection.onclose(retry);
        }
        await connection.start();
        if (stopped) {
          await connection.stop();
          return;
        }
        failures = 0;
        reportStatus(true);
        await snapshot();
      } catch {
        if (!stopped) {
          await connection?.stop();
          retry();
        }
      }
    };
    void start();
    return () => {
      if (this.connection === connection) {
        this.presenceStatus(false);
        this.connection = undefined;
        this.token = '';
      }
      stopped = true;
      clearTimeout(timer);
      void connection?.stop();
    };
  }
}
