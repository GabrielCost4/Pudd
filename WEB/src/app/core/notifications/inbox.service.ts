import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../config/api';
import type { InboxNotification } from './inbox-notification';

@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<InboxNotification[]>(API_BASE_URL + '/notifications', { timeout: 30000 });
  }

  read(ids: string[]) {
    return this.http.post<void>(API_BASE_URL + '/notifications/read', { ids }, { timeout: 30000 });
  }
}
