import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AccountStore } from '../../../../core/account/account.store';
import { NotificationStore } from '../../../../core/notifications/notification.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { ImagePicker } from '../../../../shared/components/image-picker/image-picker';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { PostService } from '../../services/post.service';
import type { Post } from '../../models/post';

@Component({
  selector: 'app-post-editor',
  imports: [
    ProgressSpinnerModule,
    CardModule,
    CheckboxModule,
    TextareaModule,
    ButtonModule,
    AvatarModule,
    RouterLink,
    ReactiveFormsModule,
    Feedback,
    ImagePicker,
  ],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor implements OnInit {
  protected readonly account = inject(AccountStore);
  protected readonly editorCardTokens = { body: { padding: '0', gap: '0' } };
  protected readonly editorTextareaTokens = {
    root: {
      fontSize: '1rem',
      paddingX: '0.875rem',
      paddingY: '0.75rem',
      borderRadius: '0.5rem',
    },
  };
  readonly postId = input<string | null>(null);
  readonly embedded = input(false);
  readonly saved = output<Post>();
  readonly cancelled = output<void>();
  readonly savingChanged = output<boolean>();
  private readonly api = inject(PostService);
  private readonly notifications = inject(NotificationStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routeId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected get id(): string | null {
    return this.postId() ?? this.routeId;
  }
  protected readonly ready = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly hasImage = signal(false);
  protected readonly image = signal<File | null>(null);
  protected readonly maxContentLength = 5000;
  protected readonly form = new FormGroup({
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.maxContentLength)],
    }),
    removeImage: new FormControl(false, { nonNullable: true }),
  });
  private readonly content = toSignal(this.form.controls.content.valueChanges, {
    initialValue: this.form.controls.content.value,
  });
  protected readonly contentLength = computed(() => this.content().length);
  protected readonly overLimit = computed(() => this.contentLength() > this.maxContentLength);
  ngOnInit(): void {
    this.ready.set(!this.id);
    if (this.id) {
      this.loading.set(true);
      this.api
        .get(this.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (post) => {
            if (post.userID !== this.session.user().id) {
              if (this.embedded()) {
                this.errors.set(['Você só pode editar suas próprias publicações.']);
                return;
              }
              void this.router.navigate(['/unauthorized'], {
                queryParams: { reason: 'forbidden' },
              });
              return;
            }
            this.ready.set(true);
            this.form.controls.content.setValue(post.content);
            this.hasImage.set(post.hasImage);
          },
          error: (error: unknown) => {
            if (!this.embedded() && error instanceof HttpErrorResponse && error.status === 404)
              void this.router.navigate(['/notfound']);
            else this.errors.set(apiErrors(error));
          },
        });
    }
  }
  protected selectImage(file: File | null): void {
    this.image.set(file);
    if (file) this.form.controls.removeImage.setValue(false);
  }
  protected save(): void {
    if (this.saving() || this.loading() || !this.ready()) return;
    this.errors.set([]);
    if (this.form.controls.content.hasError('maxlength')) {
      this.errors.set(['A publicação deve ter no máximo 5.000 caracteres.']);
      this.form.markAllAsTouched();
      return;
    }
    if (!this.form.controls.content.value.trim()) {
      this.errors.set(['Escreva o conteúdo da publicação.']);
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.savingChanged.emit(true);
    const data = new FormData();
    data.append('Content', this.form.controls.content.value);
    if (this.image()) data.append('Image', this.image()!);
    if (this.id) data.append('RemoveImage', String(this.form.controls.removeImage.value));
    this.form.disable();
    const request = this.id ? this.api.update(this.id, data) : this.api.create(data);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
          this.form.enable();
          if (!this.destroyRef.destroyed) this.savingChanged.emit(false);
        }),
      )
      .subscribe({
        next: (post) => {
          if (this.embedded()) {
            this.saved.emit(post);
            return;
          }
          this.notifications.success(
            this.id ? 'Publicação atualizada com sucesso.' : 'Publicação criada com sucesso.',
          );
          void this.router.navigate(['/posts', post.id]);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
