import { DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, finalize, Subscription } from 'rxjs';
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
    DatePipe,
    TagModule,
    TableModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly success = signal('');
  protected readonly loading = signal(false);
  protected readonly changing = signal('');
  protected readonly selectedMember = signal(false);
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('user')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => (id ? this.selectMember(id) : this.load(1)));
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }
  protected showAll(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { user: null },
      queryParamsHandling: 'merge',
    });
  }
  protected load(page: number): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errors.set([]);
    this.page.set(page);
    this.selectedMember.set(false);
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
  protected selectMember(id: string): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.errors.set([]);
    this.success.set('');
    this.request = this.api
      .user(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          this.users.set([user]);
          this.hasNext.set(false);
          this.selectedMember.set(true);
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
