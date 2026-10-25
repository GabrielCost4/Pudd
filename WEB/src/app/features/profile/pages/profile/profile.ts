import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { GalleriaModule } from 'primeng/galleria';
import { CardModule } from 'primeng/card';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, Subscription, switchMap } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AccountStore } from '../../../../core/account/account.store';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { ImagePicker } from '../../../../shared/components/image-picker/image-picker';
import { apiErrors } from '../../../../shared/utils/api-errors';
import type { Profile } from '../../models/profile';
import { ProfileService } from '../../services/profile.service';
import { ProfilePosts } from '../../../posts/public';

@Component({
  providers: [ConfirmationService],
  selector: 'app-profile',
  imports: [
    ProfilePosts,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    AvatarModule,
    GalleriaModule,
    CardModule,
    TextareaModule,
    ButtonModule,
    ReactiveFormsModule,
    Feedback,
    LabelInput,
    ImagePicker,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  private readonly confirmation = inject(ConfirmationService);
  private readonly api = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  private readonly account = inject(AccountStore);
  private readonly destroyRef = inject(DestroyRef);
  private avatarRequest?: Subscription;
  private avatarTimer?: ReturnType<typeof setTimeout>;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly isOwner = computed(() => this.profile()?.id === this.session.user().id);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly editing = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly success = signal('');
  protected readonly avatarUrl = signal('');
  protected readonly avatarFailed = signal(false);
  protected readonly avatarGalleryVisible = signal(false);
  protected readonly avatarGalleryImages = computed(() =>
    this.avatarUrl() ? [this.avatarUrl()] : [],
  );
  protected readonly avatarGalleryPt = {
    mask: { 'aria-label': 'Foto de perfil ampliada' },
    closeButton: { 'aria-label': 'Fechar foto' },
  };
  private avatarTrigger: HTMLElement | null = null;
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly pickerVersion = signal(0);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id') || 'me';
          this.loading.set(true);
          this.errors.set([]);
          this.success.set('');
          this.profile.set(null);
          this.editing.set(false);
          this.selectedImage.set(null);
          this.pickerVersion.update((value) => value + 1);
          this.closeAvatar();
          this.stopAvatar();
          this.avatarUrl.set('');
          this.avatarFailed.set(false);
          return (id === 'me' ? this.api.me() : this.api.get(id)).pipe(
            catchError((error: unknown) => {
              if (error instanceof HttpErrorResponse && error.status === 404)
                void this.router.navigate(['/notfound']);
              else this.errors.set(apiErrors(error));
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => {
        if (profile) {
          this.setProfile(profile);
          this.loadAvatar();
        }
      });
    this.destroyRef.onDestroy(() => this.stopAvatar());
  }
  private setProfile(profile: Profile): void {
    this.profile.set(profile);
    this.form.setValue({ name: profile.name, bio: profile.bio || '' });
  }
  private stopAvatar(): void {
    clearTimeout(this.avatarTimer);
    this.avatarRequest?.unsubscribe();
  }
  protected loadAvatar(): void {
    this.stopAvatar();
    const profile = this.profile();
    if (!profile?.hasAvatar) {
      this.avatarUrl.set('');
      return;
    }
    this.avatarFailed.set(false);
    this.avatarRequest = this.api.avatar(profile.id).subscribe({
      next: (response) => {
        this.avatarUrl.set(response.url);
        this.avatarTimer = setTimeout(
          () => this.loadAvatar(),
          Math.max(1000, (response.expiresInSeconds - 15) * 1000),
        );
      },
      error: () => this.avatarFailed.set(true),
    });
  }
  protected openAvatar(event: Event): void {
    if (!this.avatarUrl() || this.avatarFailed()) return;
    this.avatarTrigger = event.currentTarget as HTMLElement;
    this.avatarGalleryVisible.set(true);
  }
  protected closeAvatar(event?: Event): void {
    event?.stopPropagation();
    this.avatarGalleryVisible.set(false);
    if (this.avatarTrigger?.isConnected) this.avatarTrigger.focus({ preventScroll: true });
    this.avatarTrigger = null;
  }
  protected cancelEdit(): void {
    const profile = this.profile();
    if (profile) this.setProfile(profile);
    this.selectedImage.set(null);
    this.editing.set(false);
  }
  protected nameError(): string | null {
    return this.form.controls.name.touched && !this.form.controls.name.value.trim()
      ? 'Informe seu nome.'
      : null;
  }
  protected save(): void {
    if (this.busy()) return;
    this.errors.set([]);
    this.success.set('');
    if (!this.form.controls.name.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.api
      .update(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.setProfile(profile);
          this.selectedImage.set(null);
          this.editing.set(false);
          this.success.set('Seu perfil foi atualizado.');
          this.account.refresh();
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
  protected uploadAvatar(): void {
    const image = this.selectedImage();
    if (!image || this.busy()) return;
    const form = new FormData();
    form.append('Image', image);
    this.busy.set(true);
    this.errors.set([]);
    this.success.set('');
    this.api
      .uploadAvatar(form)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.profile.update((p) => (p ? { ...p, hasAvatar: true } : p));
          this.selectedImage.set(null);
          this.pickerVersion.update((v) => v + 1);
          this.loadAvatar();
          this.success.set('Foto de perfil atualizada.');
          this.account.refresh();
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
  protected removeAvatar(): void {
    if (this.busy()) return;
    this.confirmation.confirm({
      header: 'Remover foto de perfil',
      message: 'Remover sua foto de perfil?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      accept: () => this.performRemoveAvatar(),
    });
  }

  private performRemoveAvatar(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.errors.set([]);
    this.success.set('');
    this.api
      .removeAvatar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.stopAvatar();
          this.avatarUrl.set('');
          this.profile.update((p) => (p ? { ...p, hasAvatar: false } : p));
          this.success.set('Foto de perfil removida.');
          this.account.refresh();
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
