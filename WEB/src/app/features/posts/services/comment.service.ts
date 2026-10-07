import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../core/config/api';
import type { PageResponse } from '../../../shared/models/page-response';
import type { PostComment } from '../models/comment';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  list(postId: string, page = 1) { return this.http.get<PageResponse<PostComment>>(API_BASE_URL + '/posts/' + encodeURIComponent(postId) + '/comments', { params: { page, pageSize: 10 } }); }
  create(postId: string, content: string) { return this.http.post<PostComment>(API_BASE_URL + '/posts/' + encodeURIComponent(postId) + '/comments', { content }); }
  delete(id: string) { return this.http.delete<void>(API_BASE_URL + '/comments/' + encodeURIComponent(id)); }
  moderate(id: string) { return this.http.delete<void>(API_BASE_URL + '/admin/comments/' + encodeURIComponent(id)); }
}
