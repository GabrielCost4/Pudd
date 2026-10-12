import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  templateUrl: './brand-logo.html',
  styleUrl: './brand-logo.css',
})
export class BrandLogo {
  readonly dark = input(false);
}
