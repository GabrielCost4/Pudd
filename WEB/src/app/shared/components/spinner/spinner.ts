import { Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: '<span class="spinner" aria-hidden="true"></span>',
  styles: `
    :host {
      display: inline-flex;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `,
})
export class Spinner {}
