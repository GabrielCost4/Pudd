import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { LoginRequest } from '../models/login-request';
import type { LoginResponse } from '../models/login-response';
import type { RegisterRequest } from '../models/register-request';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);
  
  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(API_BASE_URL + '/Auth/login', request, { timeout: 30000 });
  }
  register(request: RegisterRequest) {
    return this.http.post<LoginResponse>(API_BASE_URL + '/Auth/register', request, {
      timeout: 30000,
    });
  }
}
