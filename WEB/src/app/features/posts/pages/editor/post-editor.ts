import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { ImagePicker } from '../../../../shared/components/image-picker/image-picker';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-editor',
  imports: [RouterLink, ReactiveFormsModule, Feedback, ImagePicker],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.css',
})
export class PostEditor {
  private readonly api = inject(PostService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly ready = signal(!this.id);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly hasImage = signal(false);
  protected readonly image = signal<File | null>(null);
  protected readonly form = new FormGroup({
    content: new FormControl('', { nonNullable: true }),
    removeImage: new FormControl(false, { nonNullable: true }),
  });
  constructor() {
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
            if (error instanceof HttpErrorResponse && error.status === 404)
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
    this.saving.set(true);
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
        }),
      )
      .subscribe({
        next: (post) => {
          void this.router.navigate(['/posts', post.id]);
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
