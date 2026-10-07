import { Component, input } from '@angular/core';
import { Spinner } from '../spinner/spinner';

// O seletor mantém o comportamento nativo de submit e disabled do botão.
@Component({
  selector: 'button[puddButton]',
  imports: [Spinner],
  host: { '[attr.aria-busy]': 'busy()' },
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly busy = input(false);
}
