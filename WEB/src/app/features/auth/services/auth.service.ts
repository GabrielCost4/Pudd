import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { LoginRequest } from '../models/login-request';
import type { LoginResponse } from '../models/login-response';
import type { RegisterRequest } from '../models/register-request';
import type { ForgotPasswordRequest } from '../models/forgot-password-request';
import type { ResetPasswordRequest } from '../models/reset-password-request';

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

  forgotPassword(request: ForgotPasswordRequest) {
    return this.http.post<{ message: string }>(API_BASE_URL + '/Auth/forgot-password', request, {
      timeout: 30000,
    });
  }

  resetPassword(request: ResetPasswordRequest) {
    return this.http.post<{ message: string }>(API_BASE_URL + '/Auth/reset-password', request, {
      timeout: 30000,
    });
  }
}
