import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { PostComment } from '../../models/comment';
import { CommentService } from '../../services/comment.service';

@Component({
  selector: 'app-comments',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, Feedback, Pagination],
  templateUrl: './comments.html',
  styleUrl: './comments.css',
})
export class Comments {
  readonly postId = input.required<string>();
  protected readonly session = inject(SessionStore);
  private readonly api = inject(CommentService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  protected readonly items = signal<PostComment[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal('');
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  protected readonly content = new FormControl('', { nonNullable: true });

  constructor() {
    effect(() => {
      this.postId();
      this.content.reset();
      this.load(1);
    });
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  protected load(page: number): void {
    this.request?.unsubscribe();
    this.page.set(page);
    this.loading.set(true);
    this.errors.set([]);
    this.request = this.api
      .list(this.postId(), page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.items.set(response.items);
          this.hasNext.set(response.hasNextPage);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
  protected submit(): void {
    if (this.saving() || !this.content.value.trim()) return;
    this.saving.set(true);
    this.errors.set([]);
    this.api
      .create(this.postId(), this.content.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.content.reset();
          this.load(1);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
  protected remove(comment: PostComment): void {
    if (this.deleting() || !window.confirm('Excluir este comentário definitivamente?')) return;
    this.deleting.set(comment.id);
    this.errors.set([]);
    const request =
      comment.userID === this.session.user().id
        ? this.api.delete(comment.id)
        : this.api.moderate(comment.id);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set('')),
      )
      .subscribe({
        next: () =>
          this.load(this.items().length === 1 && this.page() > 1 ? this.page() - 1 : this.page()),
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
