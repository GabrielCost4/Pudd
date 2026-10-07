import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { PostCard } from '../../components/post-card/post-card';
import { Comments } from '../../components/comments/comments';
import { PostService } from '../../services/post.service';
import type { Post } from '../../models/post';

@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, Feedback, PostCard, Comments],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
})
export class PostDetail {
  private readonly api = inject(PostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly post = signal<Post | null>(null);
  protected readonly errors = signal<string[]>([]);
  protected readonly loading = signal(true);
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.errors.set([]);
          this.post.set(null);
          return this.api.get(params.get('id') || '').pipe(
            catchError((error: unknown) => {
              if (error instanceof HttpErrorResponse && error.status === 404)
                void this.router.navigate(['/notfound']);
              else this.errors.set(apiErrors(error));
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((post) => this.post.set(post));
  }
  protected removed(): void {
    void this.router.navigate(['/feed']);
  }
}
