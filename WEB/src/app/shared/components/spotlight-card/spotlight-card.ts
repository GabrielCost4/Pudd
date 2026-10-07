import { Component, signal } from '@angular/core';
@Component({
  selector: '[puddSpotlight]',
  templateUrl: './spotlight-card.html',
  styleUrl: './spotlight-card.css',
  host: {
    '(pointermove)': 'move($event)',
    '[style.--spot-x]': 'x() + "px"',
    '[style.--spot-y]': 'y() + "px"',
  },
})
export class SpotlightCard {
  protected readonly x = signal(0);
  protected readonly y = signal(0);
  protected move(event: PointerEvent): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.x.set(event.clientX - bounds.left);
    this.y.set(event.clientY - bounds.top);
  }
}
