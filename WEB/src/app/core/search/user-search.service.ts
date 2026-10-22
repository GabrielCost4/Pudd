import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../config/api';

export interface UserSuggestion {
  id: string;
  name: string;
  hasAvatar: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserSearchService {
  private readonly http = inject(HttpClient);

  search(query: string, administrative: boolean) {
    return this.http.get<UserSuggestion[]>(
      API_BASE_URL + (administrative ? '/admin/users/search' : '/users/search'),
      { params: { q: query } },
    );
  }
}
