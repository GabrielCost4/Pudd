import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { AdminUser } from '../../models/admin-user';
import { AdminService } from '../../services/admin.service';

@Component({
  providers: [ConfirmationService],
  selector: 'app-admin-users',
  imports: [
    TagModule,
    TableModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    MessageModule,
    ButtonModule,
    RouterLink,
    Feedback,
    Pagination,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers {
  private readonly confirmation = inject(ConfirmationService);
  protected readonly session = inject(SessionStore);
  private readonly api = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly success = signal('');
  protected readonly loading = signal(false);
  protected readonly changing = signal('');
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  constructor() {
    this.load(1);
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }
  protected load(page: number): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errors.set([]);
    this.page.set(page);
    this.request = this.api
      .users(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.items);
          this.hasNext.set(response.hasNextPage);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
  protected toggle(user: AdminUser): void {
    if (this.changing()) return;
    this.confirmation.confirm({
      header: 'Alterar acesso',
      message: 'Alterar o acesso desta pessoa à comunidade?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      accept: () => this.performToggle(user),
    });
  }

  private performToggle(user: AdminUser): void {
    if (this.changing()) return;
    this.changing.set(user.id);
    this.errors.set([]);
    this.success.set('');
    this.api
      .setBlocked(user.id, !user.isBlocked)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.changing.set('')),
      )
      .subscribe({
        next: () => {
          this.users.update((items) =>
            items.map((item) =>
              item.id === user.id ? { ...item, isBlocked: !user.isBlocked } : item,
            ),
          );
          this.success.set(user.isBlocked ? 'Conta desbloqueada.' : 'Conta bloqueada.');
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
