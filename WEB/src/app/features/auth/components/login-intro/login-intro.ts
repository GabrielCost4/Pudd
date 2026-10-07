import { Component, signal } from '@angular/core';
import { BlurReveal } from '../../../../shared/components/blur-reveal/blur-reveal';
import { DriftWall } from '../../../../shared/components/drift-wall/drift-wall';
import { LOGIN_INTRO_IMAGES } from './login-intro.images';

@Component({
  selector: 'app-login-intro',
  imports: [BlurReveal, DriftWall],
  templateUrl: './login-intro.html',
  styleUrl: './login-intro.css',
})
export class LoginIntro {
  protected readonly paused = signal(false);
  protected readonly images = LOGIN_INTRO_IMAGES;
}
