import { ThemeStore } from '../../../../core/config/theme.store';
import { ThemeToggle } from '../../../../shared/components/theme-toggle/theme-toggle';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AuthService } from '../../services/auth.service';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { LoginIntro } from '../../components/login-intro/login-intro';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-login',
  imports: [
    ThemeToggle,
    CardModule,
    ButtonModule,
    ReactiveFormsModule,
    RouterLink,
    LabelInput,
    Feedback,
    LoginIntro,
    BrandLogo,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly theme = inject(ThemeStore);
  private readonly auth = inject(AuthService);

  private readonly session = inject(SessionStore);

  private readonly destroyRef = inject(DestroyRef);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  protected readonly registering = this.route.snapshot.data['register'] === true;

  protected readonly loading = signal(false);

  protected readonly messages = signal<string[]>([]);

  protected readonly form = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: this.registering ? [Validators.required] : [],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected fieldError(field: 'nome' | 'email' | 'senha'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return null;
    if (control.hasError('email')) return 'Informe um e-mail válido.';
    return { nome: 'Informe seu nome.', email: 'Informe seu e-mail.', senha: 'Informe sua senha.' }[
      field
    ];
  }

  protected submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
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
