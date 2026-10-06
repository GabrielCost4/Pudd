import { Component } from '@angular/core';
import { BlurReveal } from '../../../../shared/components/blur-reveal/blur-reveal';
import { DitherGradient } from '../../../../shared/components/dither-gradient/dither-gradient';

@Component({
  selector: 'app-login-intro',
  imports: [BlurReveal, DitherGradient],
  templateUrl: './login-intro.html',
  styleUrl: './login-intro.css',
})
export class LoginIntro {}
