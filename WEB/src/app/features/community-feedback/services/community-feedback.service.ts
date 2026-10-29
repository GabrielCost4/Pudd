import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api';

@Injectable({ providedIn: 'root' })
export class CommunityFeedbackService {
  private readonly http = inject(HttpClient);
  send(feedback: { kind: string; description: string }) {
    return this.http.post<void>(API_BASE_URL + '/feedbacks', feedback);
  }
}
