import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api';
import type { ImageUrlResponse } from '../../shared/models/image-url-response';
import type { AccountSummary } from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  me() {
    return this.http.get<AccountSummary>(API_BASE_URL + '/users/me');
  }

  avatar(id: string) {
    return this.http.get<ImageUrlResponse>(
      API_BASE_URL + '/users/' + encodeURIComponent(id) + '/avatar',
    );
  }
}
