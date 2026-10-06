import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { ApiProblem } from '../../models/login';
import { AuthService } from '../../services/auth.service';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Button } from '../../../../shared/components/button/button';
import { Signature } from '../../../../shared/components/signature/signature';
import { LoginIntro } from '../../components/login-intro/login-intro';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, LabelInput, Button, Signature, LoginIntro],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly loggedIn = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    senha: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    if (this.loading() || this.loggedIn()) return;
    this.messages.set([]);
    this.loading.set(true);
    this.form.disable();

    this.auth
      .login(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: (response) => {
          this.session.start(response.accessToken);
          this.form.controls.senha.reset();
          this.loggedIn.set(true);
        },
        error: (error: HttpErrorResponse) => {
          const problem = error.error as ApiProblem | null;
          const fieldErrors = problem?.errors ? Object.values(problem.errors).flat() : [];
          this.messages.set(
            fieldErrors.length
              ? fieldErrors
              : [
                  problem?.title ||
                    (error.status === 0
                      ? 'Não foi possível conectar à API. Tente novamente em instantes.'
                      : 'Não foi possível entrar. Tente novamente.'),
                ],
          );
        },
      });
  }

  protected useAnotherAccount(): void {
    this.session.clear();
    this.form.reset();
    this.messages.set([]);
    this.loggedIn.set(false);
  }
}
