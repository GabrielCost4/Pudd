import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { SpotlightCard } from '../../../../shared/components/spotlight-card/spotlight-card';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { Post } from '../../models/post';
import type { LikeResponse } from '../../models/like-response';
import { PostService } from '../../services/post.service';
import { LikeService } from '../../services/like.service';

@Component({
  selector: 'app-post-card', imports: [DatePipe, RouterLink, Feedback, SpotlightCard],
  templateUrl: './post-card.html', styleUrl: './post-card.css',
})
export class PostCard {
  readonly post = input.required<Post>();
  readonly deleted = output<string>();
  protected readonly session = inject(SessionStore);
  private readonly posts = inject(PostService);
  private readonly likes = inject(LikeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly likeState = signal<LikeResponse | null>(null);
  protected readonly imageUrl = signal('');
  protected readonly imageFailed = signal(false);
  protected readonly likeErrors = signal<string[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly liking = signal(false);
  protected readonly imageVersion = signal(0);
  protected readonly likesVersion = signal(0);

  constructor() {
    effect((cleanup) => {
      const id = this.post().id;
      this.likesVersion();
      this.likeState.set(null); this.likeErrors.set([]);
      const subscription = this.likes.get(id).subscribe({
        next: (value) => this.likeState.set(value),
        error: (error: unknown) => this.likeErrors.set(apiErrors(error)),
      });
      cleanup(() => subscription.unsubscribe());
    });
    effect((cleanup) => {
      const post = this.post();
      this.imageVersion();
      this.imageUrl.set(''); this.imageFailed.set(false);
      if (!post.hasImage) return;
      const subscriptions = new Subscription();
      let refresh: ReturnType<typeof setTimeout>;
      const load = () => subscriptions.add(this.posts.image(post.id).subscribe({
        next: (response) => {
          this.imageUrl.set(response.url);
          this.imageFailed.set(false);
          refresh = setTimeout(load, Math.max(1000, (response.expiresInSeconds - 15) * 1000));
        },
        error: () => this.imageFailed.set(true),
      }));
      load();
      cleanup(() => { clearTimeout(refresh); subscriptions.unsubscribe(); });
    });
  }

  protected toggleLike(): void {
    const state = this.likeState();
    if (!state || this.liking()) return;
    this.liking.set(true); this.errors.set([]);
    const request = state.liked ? this.likes.unlike(this.post().id) : this.likes.like(this.post().id);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.liking.set(false))).subscribe({
      next: (value) => this.likeState.set(value),
      error: (error: unknown) => this.errors.set(apiErrors(error)),
    });
  }

  protected remove(): void {
    if (this.busy() || !window.confirm('Excluir esta publicação e seus comentários? Esta ação é definitiva.')) return;
    this.busy.set(true); this.errors.set([]);
    const request = this.post().userID === this.session.user().id
      ? this.posts.delete(this.post().id) : this.posts.moderate(this.post().id);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => this.deleted.emit(this.post().id),
      error: (error: unknown) => this.errors.set(apiErrors(error)),
    });
  }
}
