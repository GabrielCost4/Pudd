import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { ImageUrlResponse } from '../../../shared/models/image-url-response';
import type { Profile, UpdateProfile } from '../models/profile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  me() { return this.http.get<Profile>(API_BASE_URL + '/users/me'); }
  get(id: string) { return this.http.get<Profile>(API_BASE_URL + '/users/' + encodeURIComponent(id)); }
  update(profile: UpdateProfile) { return this.http.put<Profile>(API_BASE_URL + '/users/me', profile); }
  avatar(id: string) { return this.http.get<ImageUrlResponse>(API_BASE_URL + '/users/' + encodeURIComponent(id) + '/avatar'); }
  uploadAvatar(form: FormData) { return this.http.put<void>(API_BASE_URL + '/users/me/avatar', form, { timeout: 60000 }); }
  removeAvatar() { return this.http.delete<void>(API_BASE_URL + '/users/me/avatar'); }
}
