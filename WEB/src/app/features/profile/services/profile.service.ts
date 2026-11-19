import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../../environments/environment';
import type { ImageUrlResponse } from '../../../shared/models/image-url-response';
import type { Profile, UpdateProfile } from '../models/profile';
import { AccountService } from '../../../core/account/account.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly account = inject(AccountService);
  me() {
    return this.http.get<Profile>(API_BASE_URL + '/users/me');
  }
  get(id: string) {
    return this.http.get<Profile>(API_BASE_URL + '/users/' + encodeURIComponent(id), {
      timeout: 30_000,
    });
  }
  update(profile: UpdateProfile) {
    return this.http.put<Profile>(API_BASE_URL + '/users/me', profile);
  }
  avatar(id: string, reload = false) {
    return this.account.avatar(id, reload);
  }
  uploadAvatar(form: FormData) {
    return this.http.put<void>(API_BASE_URL + '/users/me/avatar', form, { timeout: 60000 });
  }
  removeAvatar() {
    return this.http.delete<void>(API_BASE_URL + '/users/me/avatar');
  }
  banner(id: string) {
    return this.http.get<ImageUrlResponse>(
      API_BASE_URL + '/users/' + encodeURIComponent(id) + '/banner',
    );
  }
  uploadBanner(form: FormData) {
    return this.http.put<void>(API_BASE_URL + '/users/me/banner', form, { timeout: 60000 });
  }
  removeBanner() {
    return this.http.delete<void>(API_BASE_URL + '/users/me/banner');
  }
}
