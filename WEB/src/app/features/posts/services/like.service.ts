import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { LikeResponse } from '../models/like-response';

@Injectable({ providedIn: 'root' })
export class LikeService {
  private readonly http = inject(HttpClient);
  get(id: string) { return this.http.get<LikeResponse>(API_BASE_URL + '/posts/' + encodeURIComponent(id) + '/like'); }
  like(id: string) { return this.http.put<LikeResponse>(API_BASE_URL + '/posts/' + encodeURIComponent(id) + '/like', {}); }
  unlike(id: string) { return this.http.delete<LikeResponse>(API_BASE_URL + '/posts/' + encodeURIComponent(id) + '/like'); }
}
