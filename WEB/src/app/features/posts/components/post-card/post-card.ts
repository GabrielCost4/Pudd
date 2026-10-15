import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { GalleriaModule } from 'primeng/galleria';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AvatarStore } from '../../../../core/account/avatar.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { Post } from '../../models/post';
import type { LikeResponse } from '../../likes/models/like-response';
import { PostService } from '../../services/post.service';
import { LikeService } from '../../likes/services/like.service';

@Component({
  providers: [ConfirmationService],
  selector: 'app-post-card',
  imports: [
    ConfirmDialogModule,
    ProgressSpinnerModule,
    AvatarModule,
    CardModule,
    ButtonModule,
    GalleriaModule,
    DatePipe,
    RouterLink,
    Feedback,
  ],
  templateUrl: './post-card.html',
  styleUrl: './post-card.css',
})
export class PostCard {
  private readonly confirmation = inject(ConfirmationService);
  readonly post = input.required<Post>();
  readonly deleted = output<string>();
  readonly editInPlace = input(false);
  readonly editRequested = output<Post>();
  readonly collapseText = input(true);
  protected readonly expanded = signal(false);
  protected readonly canExpand = computed(() => {
    const content = this.post().content;
    return (
      this.collapseText() && (Array.from(content).length > 350 || content.split(/\r?\n/).length > 5)
    );
  });
  protected readonly visibleContent = computed(() => {
    const content = this.post().content;
    if (!this.canExpand() || this.expanded()) return content;
    const preview = Array.from(content.split(/\r?\n/).slice(0, 5).join('\n'))
      .slice(0, 350)
      .join('');
    const boundary = preview.lastIndexOf(' ');
    return (boundary > 250 ? preview.slice(0, boundary) : preview).trimEnd() + '…';
  });
  protected readonly session = inject(SessionStore);
  private readonly posts = inject(PostService);
  private readonly avatars = inject(AvatarStore);
  protected readonly authorAvatar = signal('');
  protected readonly authorAvatarFailed = signal(false);
  private readonly likes = inject(LikeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly likeState = signal<LikeResponse | null>(null);
  protected readonly imageUrl = signal('');
  protected readonly galleryVisible = signal(false);
  protected readonly galleryImages = computed(() => (this.imageUrl() ? [this.imageUrl()] : []));
  protected readonly galleryPt = {
    mask: { 'aria-label': 'Imagem da publicação' },
    closeButton: { 'aria-label': 'Fechar imagem' },
  };
  protected readonly imageButtonTokens = {
    root: { paddingX: '0', paddingY: '0', borderRadius: '0' },
  };
  private imageTrigger: HTMLElement | null = null;
  protected readonly imageFailed = signal(false);
  protected readonly likeErrors = signal<string[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly liking = signal(false);
  protected readonly imageVersion = signal(0);
  protected readonly likesVersion = signal(0);

  constructor() {
    effect((cleanup) => {
      const id = this.post().userID;
      this.avatars.revision();
      this.authorAvatar.set('');
      this.authorAvatarFailed.set(false);
      const request = this.avatars.image(id).subscribe((url) => {
        this.authorAvatar.set(url);
        this.authorAvatarFailed.set(false);
      });
      cleanup(() => request.unsubscribe());
    });
    effect(() => {
      this.post();
      this.expanded.set(false);
    });
    effect((cleanup) => {
      const id = this.post().id;
      this.likesVersion();
      this.likeState.set(null);
      this.likeErrors.set([]);
      const subscription = this.likes.get(id).subscribe({
        next: (value) => this.likeState.set(value),
        error: (error: unknown) => this.likeErrors.set(apiErrors(error)),
      });
      cleanup(() => subscription.unsubscribe());
    });
    effect((cleanup) => {
      const post = this.post();
      this.imageVersion();
      this.imageUrl.set('');
      this.imageFailed.set(false);
      if (!post.hasImage) return;
      const subscriptions = new Subscription();
      let refresh: ReturnType<typeof setTimeout>;
      const load = () =>
        subscriptions.add(
          this.posts.image(post.id).subscribe({
            next: (response) => {
              this.imageUrl.set(response.url);
              this.imageFailed.set(false);
              refresh = setTimeout(load, Math.max(1000, (response.expiresInSeconds - 15) * 1000));
            },
            error: () => this.imageFailed.set(true),
          }),
        );
      load();
      cleanup(() => {
        clearTimeout(refresh);
        subscriptions.unsubscribe();
      });
    });
  }

  protected toggleLike(): void {
    const state = this.likeState();
    if (!state || this.liking()) return;
    this.liking.set(true);
    this.errors.set([]);
    const request = state.liked
      ? this.likes.unlike(this.post().id)
      : this.likes.like(this.post().id);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.liking.set(false)),
      )
      .subscribe({
        next: (value) => this.likeState.set(value),
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }

  protected openGallery(event: Event): void {
    if (!this.imageUrl() || this.imageFailed()) return;
    this.imageTrigger = event.currentTarget as HTMLElement;
    this.galleryVisible.set(true);
  }

  protected closeGallery(event?: Event): void {
    event?.stopPropagation();
    this.galleryVisible.set(false);
    this.imageTrigger?.focus({ preventScroll: true });
    this.imageTrigger = null;
  }

  protected remove(): void {
    if (this.busy()) return;
    this.confirmation.confirm({
      header: 'Excluir publicação',
      message: 'Excluir esta publicação e seus comentários? Esta ação é definitiva.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      accept: () => this.performRemove(),
    });
  }

  private performRemove(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.errors.set([]);
    const request =
      this.post().userID === this.session.user().id
        ? this.posts.delete(this.post().id)
        : this.posts.moderate(this.post().id);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => this.deleted.emit(this.post().id),
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
