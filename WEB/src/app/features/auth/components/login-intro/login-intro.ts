import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
@Component({
  selector: 'app-login-intro',
  imports: [CardModule, TagModule],
  templateUrl: './login-intro.html',
  styleUrl: './login-intro.css',
})
export class LoginIntro {}
