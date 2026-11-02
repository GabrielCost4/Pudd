import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { StepperModule } from 'primeng/stepper';
import { AuthService } from '../../services/auth.service';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';
import { ThemeToggle } from '../../../../shared/components/theme-toggle/theme-toggle';
import { ThemeStore } from '../../../../core/config/theme.store';
import { apiErrors } from '../../../../shared/utils/api-errors';

type Step = 'email' | 'otp' | 'password';

@Component({
  selector: 'app-forgot-password',
  imports: [
    CardModule,
    ButtonModule,
    InputOtpModule,
    StepperModule,
    ReactiveFormsModule,
    RouterLink,
    LabelInput,
    Feedback,
    BrandLogo,
    ThemeToggle,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  protected readonly theme = inject(ThemeStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeStep = signal(1);
  protected readonly stepProgress = signal(0);
  protected readonly recoverySteps = [
    {
      value: 1,
      label: 'Identifique',
      icon: 'pi-envelope',
      title: 'Informe seu e-mail',
      description: 'Enviaremos um código de uso único diretamente para o seu e-mail cadastrado.',
    },
    {
      value: 2,
      label: 'Valide',
      icon: 'pi-shield',
      title: 'Código de 6 dígitos',
      description: 'Autenticação temporária com código seguro válido por 15 minutos.',
    },
    {
      value: 3,
      label: 'Redefina',
      icon: 'pi-lock',
      title: 'Nova senha forte',
      description: 'Defina sua nova credencial criptografada e volte a acessar a comunidade.',
    },
  ];

  protected readonly step = signal<Step>('email');
  protected readonly loading = signal(false);
  protected readonly messages = signal<string[]>([]);

  // Armazena o e-mail confirmado para usar nos passos seguintes
  private confirmedEmail = '';

  protected readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly otpForm = new FormGroup({
    otp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly passwordForm = new FormGroup({
    novaSenha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8), Validators.maxLength(20)],
    }),
    confirmaSenha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private readonly passwordValue = signal('');

  protected readonly passwordStrength = computed(() => {
    const password = this.passwordValue();
    if (!password) return null;

    const score = [
      password.length >= 8,
      password.length >= 12,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;

    const levels = [
      { label: 'Fraca', icon: 'pi-exclamation-triangle', percentage: 15, tone: 'weak' },
      { label: 'Fraca', icon: 'pi-exclamation-triangle', percentage: 30, tone: 'weak' },
      { label: 'Razoável', icon: 'pi-minus-circle', percentage: 50, tone: 'fair' },
      { label: 'Boa', icon: 'pi-check-circle', percentage: 70, tone: 'good' },
      { label: 'Forte', icon: 'pi-shield', percentage: 85, tone: 'strong' },
      { label: 'Muito forte', icon: 'pi-lock', percentage: 95, tone: 'strong' },
      { label: 'Muito forte', icon: 'pi-lock', percentage: 100, tone: 'strong' },
    ];
    return levels[score];
  });

  constructor() {
    afterNextRender(() => {
      let elapsed = 0;
      interval(50)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          elapsed += 50;
          if (elapsed >= 4500) {
            elapsed = 0;
            this.activeStep.update((s) => (s === 3 ? 1 : s + 1));
          }
          this.stepProgress.set(Math.min(100, (this.activeStep() - 1 + elapsed / 4500) * 50));
        });
    });
  }

  protected onPasswordInput(event: Event): void {
    this.passwordValue.set((event.target as HTMLInputElement).value);
  }

  protected submitEmail(): void {
    if (this.loading()) return;
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.messages.set([]);
    this.loading.set(true);
    this.emailForm.disable();

    const { email } = this.emailForm.getRawValue();

    this.auth
      .forgotPassword({ email })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.emailForm.enable();
        }),
      )
      .subscribe({
        next: () => {
          this.confirmedEmail = email;
          this.step.set('otp');
        },
        error: (error: unknown) => this.messages.set(apiErrors(error)),
      });
  }

  protected submitOtp(): void {
    if (this.loading()) return;
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.messages.set([]);
    this.step.set('password');
  }

  protected submitPassword(): void {
    if (this.loading()) return;
    const { novaSenha, confirmaSenha } = this.passwordForm.getRawValue();
    if (novaSenha !== confirmaSenha) {
      this.messages.set(['As senhas não coincidem.']);
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.messages.set([]);
    this.loading.set(true);
    this.passwordForm.disable();

    const { otp } = this.otpForm.getRawValue();

    this.auth
      .resetPassword({ email: this.confirmedEmail, otp, novaSenha })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.passwordForm.enable();
        }),
      )
      .subscribe({
        next: () => void this.router.navigate(['/login'], { queryParams: { reset: 'true' } }),
        error: (error: unknown) => {
          this.messages.set(apiErrors(error));
          this.step.set('otp');
          this.otpForm.reset();
          this.passwordForm.reset();
          this.passwordValue.set('');
        },
      });
  }

  protected backToEmail(): void {
    this.step.set('email');
    this.otpForm.reset();
    this.messages.set([]);
  }

  protected emailFieldError(): string | null {
    const c = this.emailForm.controls.email;
    if (!c.touched || !c.invalid) return null;
    if (c.hasError('email')) return 'Informe um e-mail válido.';
    return 'Informe seu e-mail.';
  }

  protected passwordFieldError(field: 'novaSenha' | 'confirmaSenha'): string | null {
    const c = this.passwordForm.controls[field];
    if (!c.touched || !c.invalid) return null;
    if (field === 'novaSenha') {
      if (c.hasError('minlength') || c.hasError('maxlength'))
        return 'A senha deve ter entre 8 e 20 caracteres.';
      return 'Informe a nova senha.';
    }
    return 'Confirme sua senha.';
  }
}
