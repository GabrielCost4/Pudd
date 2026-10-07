import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { BlurReveal } from '../../../../shared/components/blur-reveal/blur-reveal';
import { SpotlightCard } from '../../../../shared/components/spotlight-card/spotlight-card';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { PostCard } from '../../components/post-card/post-card';
import { PostService } from '../../services/post.service';
import type { Post } from '../../models/post';

@Component({
  selector: 'app-feed', imports: [RouterLink, Feedback, Pagination, BlurReveal, SpotlightCard, PostCard],
  templateUrl: './feed.html', styleUrl: './feed.css',
})
export class Feed {
  protected readonly session = inject(SessionStore);
  private readonly api = inject(PostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly errors = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  protected readonly authorId = signal('');
  constructor() {
    this.route.queryParamMap.pipe(switchMap((params) => {
      const page = Math.max(1, Math.min(1000000, Number(params.get('page')) || 1));
      this.page.set(Math.floor(page)); this.authorId.set(params.get('authorId') || '');
      this.loading.set(true); this.errors.set([]); this.posts.set([]);
      return this.api.list(this.page(), this.authorId() || undefined).pipe(
        catchError((error: unknown) => { this.errors.set(apiErrors(error)); return of(null); }),
        finalize(() => this.loading.set(false)),
      );
    }), takeUntilDestroyed(inject(DestroyRef))).subscribe((response) => {
      if (response) { this.posts.set(response.items); this.hasNext.set(response.hasNextPage); }
    });
  }
  protected changePage(page: number): void {
    void this.router.navigate(['/feed'], { queryParams: { page, authorId: this.authorId() || null } });
  }
  protected reload(): void { void this.router.navigateByUrl('/feed?reload=' + Date.now() + (this.authorId() ? '&authorId=' + encodeURIComponent(this.authorId()) : '') + '&page=' + this.page()); }
  protected removed(id: string): void {
    this.posts.update((items) => items.filter((item) => item.id !== id));
    if (!this.posts().length && this.page() > 1) this.changePage(this.page() - 1);
  }
}
