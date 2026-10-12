import { Component, input } from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-login-intro',
  imports: [StepperModule, BrandLogo],
  templateUrl: './login-intro.html',
  styleUrl: './login-intro.css',
})
export class LoginIntro {
  readonly dark = input(false);
}
