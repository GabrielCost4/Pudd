import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { from, concatMap, finalize, tap, Subscription } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { InboxService } from './inbox.service';
import { InboxRealtime } from './inbox-realtime';
import type { InboxNotification } from './inbox-notification';

@Injectable({ providedIn: 'root' })
export class InboxStore {
  private readonly api = inject(InboxService);
  private readonly realtime = inject(InboxRealtime);
  private readonly session = inject(SessionStore);
  readonly items = signal<InboxNotification[]>([]);
  readonly seen = signal<ReadonlySet<string>>(new Set());
  readonly count = computed(() => this.items().filter((item) => !this.seen().has(item.id)).length);
  readonly online = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  private deleted = new Set<string>();
  private reading = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private request?: Subscription;
  private readRequest?: Subscription;
  private generation = 0;

  constructor() {
    effect((cleanup) => {
      const token = this.session.accessToken();
      this.reset();
      if (!token) return;
      this.refresh();
      const generation = this.generation;
      cleanup(
        this.realtime.connect(
          token,
          (items) => {
            if (generation !== this.generation) return;
            this.request?.unsubscribe();
            this.loading.set(false);
            this.apply(items);
          },
          (online) => {
            if (generation === this.generation) this.online.set(online);
          },
        ),
      );
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  refresh(): void {
    if (!this.session.accessToken()) return;
    this.request?.unsubscribe();
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          if (generation === this.generation) this.apply(items);
        },
        error: () => this.error.set('Não foi possível atualizar as notificações. Tente novamente.'),
      });
  }

  private apply(items: InboxNotification[]): void {
    const merged = new Map(
      items.filter((item) => !this.deleted.has(item.id)).map((item) => [item.id, item]),
    );
    // Keep the clicked snapshot visible until the seen animation finishes.
    for (const item of this.items()) {
      if (this.reading.has(item.id) || this.seen().has(item.id)) merged.set(item.id, item);
    }
    this.items.set(
      [...merged.values()].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      ),
    );
  }

  markRead(
    ids = this.items()
      .filter((item) => !this.seen().has(item.id))
      .map((item) => item.id),
  ): void {
    if (!ids.length || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.reading = new Set(ids);
    const chunks = Array.from({ length: Math.ceil(ids.length / 500) }, (_, index) =>
      ids.slice(index * 500, index * 500 + 500),
    );
    this.readRequest = from(chunks)
      .pipe(
        concatMap((chunk) =>
          this.api.read(chunk).pipe(
            tap(() => {
              for (const id of chunk) {
                this.deleted.add(id);
                this.reading.delete(id);
              }
              this.seen.update((seen) => new Set([...seen, ...chunk]));
              const timer = setTimeout(() => {
                this.items.update((items) => items.filter((item) => !chunk.includes(item.id)));
                this.seen.update((seen) => new Set([...seen].filter((id) => !chunk.includes(id))));
                this.timers.delete(timer);
              }, 900);
              this.timers.add(timer);
            }),
          ),
        ),
        finalize(() => {
          this.busy.set(false);
          this.reading.clear();
        }),
      )
      .subscribe({
        error: () =>
          this.error.set('Não foi possível marcar todas as notificações. Tente novamente.'),
      });
  }

  private reset(): void {
    this.generation++;
    this.request?.unsubscribe();
    this.readRequest?.unsubscribe();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.reading.clear();
    this.deleted.clear();
    this.items.set([]);
    this.seen.set(new Set());
    this.online.set(false);
    this.loading.set(false);
    this.busy.set(false);
    this.error.set('');
  }
}
