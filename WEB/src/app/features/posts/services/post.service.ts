import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { PageResponse } from '../../../shared/models/page-response';
import type { ImageUrlResponse } from '../../../shared/models/image-url-response';
import type { Post } from '../models/post';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);
  list(page = 1, authorId?: string) {
    const params: Record<string, string | number> = { page, pageSize: 6 };
    if (authorId) params['authorId'] = authorId;
    return this.http.get<PageResponse<Post>>(API_BASE_URL + '/posts', { params, timeout: 30000 });
  }
  get(id: string) { return this.http.get<Post>(API_BASE_URL + '/posts/' + encodeURIComponent(id)); }
  create(form: FormData) { return this.http.post<Post>(API_BASE_URL + '/posts', form, { timeout: 60000 }); }
  update(id: string, form: FormData) { return this.http.put<Post>(API_BASE_URL + '/posts/' + encodeURIComponent(id), form, { timeout: 60000 }); }
  delete(id: string) { return this.http.delete<void>(API_BASE_URL + '/posts/' + encodeURIComponent(id)); }
  moderate(id: string) { return this.http.delete<void>(API_BASE_URL + '/admin/posts/' + encodeURIComponent(id)); }
  image(id: string) { return this.http.get<ImageUrlResponse>(API_BASE_URL + '/posts/' + encodeURIComponent(id) + '/image'); }
}
