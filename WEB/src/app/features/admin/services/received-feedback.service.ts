import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api';
import type { PageResponse } from '../../../shared/models/page-response';
import type { ReceivedFeedback } from '../models/received-feedback';

@Injectable({ providedIn: 'root' })
export class ReceivedFeedbackService {
  private readonly http = inject(HttpClient);
  list(page: number) {
    return this.http.get<PageResponse<ReceivedFeedback>>(API_BASE_URL + '/admin/feedbacks', {
      params: { page, pageSize: 20 },
    });
  }
}
