import { AdminNavigation } from '../../components/admin-navigation/admin-navigation';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ReceivedFeedbackService } from '../../services/received-feedback.service';
import type { ReceivedFeedback } from '../../models/received-feedback';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { apiErrors } from '../../../../shared/utils/api-errors';

@Component({
  selector: 'app-received-feedbacks',
  imports: [
    AdminNavigation,
    DatePipe,
    ButtonModule,
    CardModule,
    TagModule,
    Feedback,
    Pagination,
  ],
  templateUrl: './received-feedbacks.html',
  styleUrl: './received-feedbacks.css',
})
export class ReceivedFeedbacks {
  private readonly api = inject(ReceivedFeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly items = signal<ReceivedFeedback[]>([]);
  protected readonly loading = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  constructor() {
    this.load(1);
  }
  protected load(page: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errors.set([]);
    this.api
      .list(page)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.hasNext.set(result.hasNextPage);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
