import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { PageResponse } from '../../../shared/models/page-response';
import type { AdminUser } from '../models/admin-user';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private readonly http = inject(HttpClient);

  users(page = 1) {
    return this.http.get<PageResponse<AdminUser>>(API_BASE_URL + '/admin/users', {
      params: { page, pageSize: 15 },
    });
  }
  
  setBlocked(id: string, isBlocked: boolean) {
    return this.http.put<void>(
      API_BASE_URL + '/admin/users/' + encodeURIComponent(id) + '/blocked',
      { isBlocked },
    );
  }
}
