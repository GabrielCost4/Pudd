import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AccountStore } from '../../../../core/account/account.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { PostCard } from '../../components/post-card/post-card';
import { PostService } from '../../services/post.service';
import type { Post } from '../../models/post';
import { PostEditor } from '../editor/post-editor';

@Component({
  selector: 'app-feed',
  imports: [
    SkeletonModule,
    AvatarModule,
    CardModule,
    ButtonModule,
    RouterLink,
    Feedback,
    Pagination,
    PostCard,
    DialogModule,
    PostEditor,
  ],
  templateUrl: './feed.html',
  styleUrl: './feed.css',
})
export class Feed {
  protected readonly aboutOpen = signal(false);
  protected readonly aboutCardTokens = {
    root: {
      background: '{primary.950}',
      borderRadius: '0.75rem',
      shadow: 'inset 0 0 0 1px {primary.800}',
    },
    body: { padding: '1.25rem', gap: '0' },
  };
  protected readonly account = inject(AccountStore);
  protected readonly composerCardTokens = { body: { padding: '1rem', gap: '0' } };
  protected readonly composerButtonTokens = {
    root: { paddingX: '0.25rem', paddingY: '0.25rem', gap: '0.875rem' },
  };
  protected readonly session = inject(SessionStore);
  private readonly api = inject(PostService);
  private readonly document = inject(DOCUMENT);
  private editTrigger: HTMLElement | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly loaded = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly success = signal('');
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  protected readonly authorId = signal('');
  protected readonly editingPost = signal<Post | null>(null);
  protected readonly editSaving = signal(false);

  protected openEditor(post: Post): void {
    if (post.userID !== this.session.user().id) return;
    this.success.set('');
    const activeElement = this.document.activeElement;
    this.editTrigger = activeElement instanceof HTMLElement ? activeElement : null;
    this.editSaving.set(false);
    this.editingPost.set(post);
  }

  protected closeEditor(): void {
    if (!this.editSaving()) this.editingPost.set(null);
  }

  protected restoreEditFocus(): void {
    this.editTrigger?.focus({ preventScroll: true });
    this.editTrigger = null;
  }

  protected updated(post: Post): void {
    this.success.set('Publicação atualizada com sucesso.');
    this.posts.update((items) => items.map((item) => (item.id === post.id ? post : item)));
    this.editSaving.set(false);
    this.editingPost.set(null);
  }
  constructor() {
    this.route.queryParamMap
      .pipe(
        switchMap((params) => {
          const page = Math.max(1, Math.min(1000000, Number(params.get('page')) || 1));
          this.page.set(Math.floor(page));
          this.authorId.set(params.get('authorId') || '');
          this.loading.set(true);
          this.errors.set([]);
          this.success.set('');
          return this.api.list(this.page(), this.authorId() || undefined).pipe(
            catchError((error: unknown) => {
              this.errors.set(apiErrors(error));
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((response) => {
        if (response) {
          this.posts.set(response.items);
          this.hasNext.set(response.hasNextPage);
          this.loaded.set(true);
        }
      });
  }
  protected changePage(page: number): void {
    void this.router.navigate(['/feed'], {
      queryParams: { page, authorId: this.authorId() || null },
    });
  }
  protected reload(): void {
    void this.router.navigateByUrl(
      '/feed?reload=' +
        Date.now() +
        (this.authorId() ? '&authorId=' + encodeURIComponent(this.authorId()) : '') +
        '&page=' +
        this.page(),
    );
  }
  protected removed(id: string): void {
    this.posts.update((items) => items.filter((item) => item.id !== id));
    if (!this.posts().length && this.page() > 1) this.changePage(this.page() - 1);
  }

  public saudacao(): string {
    const data = new Date();
    const horaLogin = data.getHours();
    if (horaLogin < 12) {
      return 'Bom dia';
    } else if (horaLogin < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  }
}
