import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.html',
  styleUrl: './signature.css',
})
export class Signature {
  readonly text = input('Pudd');
  readonly fontSize = input(44);
  readonly duration = input(2);

  private readonly document = inject(DOCUMENT);
  private readonly lettering = viewChild.required<ElementRef<SVGTextElement>>('lettering');
  private readonly fontLoaded = signal(false);
  private readonly aspectRatio = signal(2);

  protected readonly measured = signal(false);
  protected readonly viewBox = signal('0 -100 200 100');
  protected readonly width = computed(() => this.fontSize() * this.aspectRatio());
  protected readonly height = computed(() => this.fontSize());

  constructor() {
    afterNextRender(() => {
      if (!this.document.fonts) {
        this.fontLoaded.set(true);
        return;
      }
      this.document.fonts.load('100px "Pudd Signature"', this.text()).then(
        () => this.fontLoaded.set(true),
        () => this.fontLoaded.set(true),
      );
    });

    afterRenderEffect(() => {
      if (!this.fontLoaded()) return;
      this.text();
      const element = this.lettering().nativeElement;
      // O navegador mede os traços reais, incluindo as extensões da fonte manuscrita.
      if (typeof element.getBBox === 'function') {
        const bounds = element.getBBox();
        if (bounds.width > 0 && bounds.height > 0) {
          const padding = 4;
          const width = bounds.width + padding * 2;
          const height = bounds.height + padding * 2;
          this.aspectRatio.set(width / height);
          this.viewBox.set(`${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);
        }
      }
      this.measured.set(true);
    });
  }
}
