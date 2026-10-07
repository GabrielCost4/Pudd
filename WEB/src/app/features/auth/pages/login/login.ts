import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AuthService } from '../../services/auth.service';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Button } from '../../../../shared/components/button/button';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { LoginIntro } from '../../components/login-intro/login-intro';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LabelInput, Button, Feedback, LoginIntro],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly registering = this.route.snapshot.data['register'] === true;
  protected readonly loading = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    senha: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    if (this.loading()) return;
    this.messages.set([]);
    this.loading.set(true);
    const { nome, email, senha } = this.form.getRawValue();
    this.form.disable();
    const request = this.registering
      ? this.auth.register({ nome, email, senha })
      : this.auth.login({ email, senha });
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: (response) => {
          this.form.controls.senha.reset();
          if (!this.session.start(response.accessToken, response.role)) {
            this.messages.set([
              'A API retornou uma sessão inválida ou expirada. Tente entrar novamente.',
            ]);
            return;
          }
          const requested = this.route.snapshot.queryParamMap.get('returnUrl');
          const target =
            requested && /^\/(feed|posts|profile|admin)(\/|\?|$)/.test(requested)
              ? requested
              : '/feed';
          void this.router.navigateByUrl(target);
        },
        error: (error: unknown) => this.messages.set(apiErrors(error)),
      });
  }
}
