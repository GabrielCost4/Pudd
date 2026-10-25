import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { PostService } from '../../services/post.service';
import { PostCard } from '../post-card/post-card';
import { PostTile } from './post-tile';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import type { Post } from '../../models/post';

@Component({
  selector: 'app-profile-posts',
  imports: [ButtonModule, DialogModule, MessageModule, Pagination, PostCard, PostTile],
  templateUrl: './profile-posts.html',
  styleUrl: './profile-posts.css',
})
export class ProfilePosts {
  readonly authorId = input.required<string>();
  private readonly api = inject(PostService);
  protected readonly images = signal(true);
  protected readonly page = signal(1);
  protected readonly posts = signal<Post[]>([]);
  protected readonly hasNext = signal(false);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly selected = signal<Post | null>(null);
  protected readonly opened = signal(false);
  private readonly reload = new Subject<{ authorId: string; images: boolean; page: number }>();

  constructor() {
    this.reload
      .pipe(
        switchMap(({ authorId, images, page }) => {
          this.loading.set(true);
          this.failed.set(false);
          this.posts.set([]);
          return this.api.profile(authorId, images, page).pipe(
            catchError(() => {
              this.failed.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) => {
        this.posts.set(result?.items ?? []);
        this.hasNext.set(result?.hasNextPage ?? false);
        this.loading.set(false);
      });
    effect(() => {
      const authorId = this.authorId();
      this.images.set(true);
      this.page.set(1);
      this.opened.set(false);
      this.selected.set(null);
      this.reload.next({ authorId, images: true, page: 1 });
    });
  }

  protected load(page = this.page()): void {
    this.page.set(page);
    this.reload.next({ authorId: this.authorId(), images: this.images(), page });
  }

  protected changeTab(images: boolean): void {
    if (this.images() === images) return;
    this.images.set(images);
    this.load(1);
  }

  protected open(post: Post): void {
    this.selected.set(post);
    this.opened.set(true);
  }

  protected removed(): void {
    this.opened.set(false);
    this.selected.set(null);
    this.load();
  }
}
