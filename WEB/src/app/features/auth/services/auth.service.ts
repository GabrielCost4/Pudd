import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { LoginRequest } from '../Interfaces/Login/LoginRequest';
import type { LoginResponse } from '../Interfaces/Login/LoginResponse';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/Auth/login`, request, {
      timeout: 30000,
    });
  }
}
