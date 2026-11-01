import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { SessionStore } from '../../../../core/auth/session.store';
import { AuthService } from '../../services/auth.service';
import { LabelInput } from '../../../../shared/components/label-input/label-input';
import { Feedback } from '../../../../shared/components/feedback/feedback';
import { apiErrors } from '../../../../shared/utils/api-errors';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';
import { ThemeStore } from '../../../../core/config/theme.store';
import { ThemeToggle } from '../../../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [
    CardModule,
    ButtonModule,
    StepperModule,
    ReactiveFormsModule,
    RouterLink,
    LabelInput,
    Feedback,
    BrandLogo,
    ThemeToggle,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly activeStep = signal(1);
  protected readonly stepProgress = signal(0);
  protected readonly communitySteps = [
    {
      value: 1,
      label: 'Entre',
      icon: 'pi-user',
      title: 'Seu lugar no Pudd',
      description: 'Crie seu perfil e compartilhe o que você cria, aprende e descobre.',
    },
    {
      value: 2,
      label: 'Explore',
      icon: 'pi-compass',
      title: 'Descubra novas ideias',
      description:
        'Explore publicações, encontre projetos e acompanhe os aprendizados da comunidade.',
    },
    {
      value: 3,
      label: 'Converse',
      icon: 'pi-comments',
      title: 'Conecte-se com a comunidade',
      description:
        'Troque experiências, participe das conversas e dê vida às suas ideias com outras pessoas.',
    },
  ];
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

  private readonly passwordValue = toSignal(this.form.controls.senha.valueChanges, {
    initialValue: this.form.controls.senha.value,
  });

  protected readonly passwordStrength = computed(() => {
    const password = this.passwordValue();
    if (!this.registering || !password) return null;

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
            this.activeStep.update((step) => (step === 3 ? 1 : step + 1));
          }
          this.stepProgress.set(Math.min(100, (this.activeStep() - 1 + elapsed / 4500) * 50));
        });
    });
  }

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
