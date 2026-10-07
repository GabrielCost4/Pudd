import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-drift-wall',
  templateUrl: './drift-wall.html',
  styleUrl: './drift-wall.css',
  host: {
    'aria-hidden': 'true',
    '[class.paused]': 'paused() || !visible()',
  },
})
export class DriftWall {
  readonly images = input<readonly string[]>([]);
  readonly paused = input(false);
  protected readonly desktop = signal(false);
  protected readonly visible = signal(false);
  protected readonly copies = [0, 1, 2];
  protected readonly columns = computed(() =>
    Array.from({ length: 3 }, (_, column) =>
      this.images().filter((_, index) => index % 3 === column),
    ),
  );

  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const media = window.matchMedia('(min-width: 768px)');
      const updateDesktop = () => this.desktop.set(media.matches);
      updateDesktop();
      media.addEventListener('change', updateDesktop);

      const observer = new IntersectionObserver(([entry]) =>
        this.visible.set(entry.isIntersecting),
      );
      observer.observe(element);
      destroyRef.onDestroy(() => {
        media.removeEventListener('change', updateDesktop);
        observer.disconnect();
      });
    });
  }
}
