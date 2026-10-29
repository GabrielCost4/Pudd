import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { CommunityFeedbackService } from '../services/community-feedback.service';
import { Feedback } from '../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../shared/utils/api-errors';

@Component({
  selector: 'app-community-feedback',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    SelectButtonModule,
    TextareaModule,
    CardModule,
    Feedback,
  ],
  templateUrl: './community-feedback.html',
  styleUrl: './community-feedback.css',
})
export class CommunityFeedbackPage {
  private readonly api = inject(CommunityFeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly kinds = [
    { label: 'Sugestão', value: 'Suggestion' },
    { label: 'Relatar bug', value: 'Bug' },
  ];
  protected readonly form = new FormGroup({
    kind: new FormControl('Suggestion', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(3000)],
    }),
  });
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.form.controls.kind.setValue(params.get('type') === 'bug' ? 'Bug' : 'Suggestion');
        this.sent.set(false);
      });
  }

  protected submit(): void {
    if (this.busy()) return;
    this.form.controls.description.setValue(this.form.controls.description.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.errors.set([]);
    this.api
      .send(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.sent.set(true);
          this.form.reset();
        },
        error: (error: unknown) => this.errors.set(apiErrors(error)),
      });
  }
}
