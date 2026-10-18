import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { BrandLogo } from '../../../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-login-intro',
  imports: [StepperModule, BrandLogo],
  templateUrl: './login-intro.html',
  styleUrl: './login-intro.css',
})
export class LoginIntro {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('ditherCanvas');
  protected readonly ditherReady = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      const context = canvas.getContext('2d');
      if (!context) return;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      let pixels: ImageData | undefined;
      let frame = 0;
      let previous = 0;
      let visible = false;
      const draw = (time: number) => {
        if (!pixels) return;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const u = x / canvas.width;
            const v = y / canvas.height;
            const wave =
              Math.sin(u * 5 + time * 0.3) +
              Math.cos(v * 4 - time * 0.25) +
              Math.sin((u + v) * 3 - time * 0.2);
            const level = 0.35 + wave * 0.18;
            const lit = level > (bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
            const offset = (y * canvas.width + x) * 4;
            pixels.data[offset] = lit ? 92 : 0;
            pixels.data[offset + 1] = lit ? 122 : 0;
            pixels.data[offset + 2] = lit ? 102 : 0;
            pixels.data[offset + 3] = 255;
          }
        }
        context.putImageData(pixels, 0, 0);
        this.ditherReady.set(true);
      };
      const animate = (time: number) => {
        if (time - previous >= 50) {
          draw(time / 1000);
          previous = time;
        }
        frame = requestAnimationFrame(animate);
      };
      const sync = () => {
        cancelAnimationFrame(frame);
        if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
        else if (motion.matches) draw(0);
      };
      const resize = new ResizeObserver(() => {
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        canvas.width = Math.min(480, Math.ceil(bounds.width / 2));
        canvas.height = Math.min(720, Math.ceil(bounds.height / 2));
        pixels = context.createImageData(canvas.width, canvas.height);
        draw(0);
        sync();
      });
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
      resize.observe(canvas);
      intersection.observe(canvas);
      motion.addEventListener('change', sync);
      document.addEventListener('visibilitychange', sync);
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        intersection.disconnect();
        motion.removeEventListener('change', sync);
        document.removeEventListener('visibilitychange', sync);
      });
    });
  }
}
