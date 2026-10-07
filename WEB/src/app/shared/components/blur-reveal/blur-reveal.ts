import { Component, input } from '@angular/core';

@Component({
  selector: '[puddBlurReveal]',
  templateUrl: './blur-reveal.html',
  styleUrl: './blur-reveal.css',
  host: {
    '[style.--reveal-delay]': 'delay() + "s"',
    '[style.--reveal-duration]': 'duration() + "s"',
  },
})
export class BlurReveal {
  readonly delay = input(0);
  readonly duration = input(0.9);
}
