import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  input,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-image-viewer',
  imports: [ButtonModule, DialogModule, NgTemplateOutlet],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.css',
})
export class ImageViewer {
  private readonly document = inject(DOCUMENT);
  readonly src = input.required<string>();
  readonly alt = input('Imagem');
  readonly mobileOverlay = input(false);
  readonly visible = model(false);
  protected readonly zoom = signal(100);
  protected readonly pan = signal({ x: 0, y: 0 });
  protected readonly dragging = signal(false);
  protected readonly failed = signal(false);
  private readonly natural = signal({ width: 0, height: 0 });
  private readonly fit = signal({ width: 0, height: 0 });
  private readonly viewportSize = signal({ width: 0, height: 0 });
  private readonly screen = signal({ width: 1024, height: 768 });
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  protected readonly size = computed(() => ({
    width: (this.fit().width * this.zoom()) / 100,
    height: (this.fit().height * this.zoom()) / 100,
  }));
  protected readonly canPan = computed(() => this.zoom() > 100 && this.natural().width > 0);
  protected readonly mobile = computed(() => this.mobileOverlay() && this.screen().width <= 700);
  private readonly mobileSurface = viewChild<ElementRef<HTMLElement>>('mobileSurface');
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch?: {
    distance: number;
    zoom: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  };
  protected readonly frame = computed(() => ({
    width: this.mobile() ? this.screen().width : Math.min(this.screen().width * 0.92, 960),
    height: this.mobile() ? this.screen().height : Math.min(this.screen().height * 0.84, 720),
  }));
  private returnFocus?: HTMLElement;
  private wasVisible = false;
  private drag?: { id: number; x: number; y: number; originX: number; originY: number };

  constructor() {
    const window = this.document.defaultView;
    if (window) {
      const resize = () =>
        this.screen.set({ width: window.innerWidth, height: window.innerHeight });
      resize();
      window.addEventListener('resize', resize);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', resize));
    }
    effect(() => {
      this.src();
      const visible = this.visible();
      if (visible && !this.wasVisible)
        this.returnFocus = this.document.activeElement as HTMLElement;
      this.wasVisible = visible;
      this.reset();
      this.failed.set(false);
      this.natural.set({ width: 0, height: 0 });
      this.fit.set({ width: 0, height: 0 });
    });
    effect((cleanup) => {
      const surface = this.mobileSurface()?.nativeElement;
      if (!surface) return;
      surface.showPopover();
      const previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
      surface.querySelector<HTMLElement>('.viewport')?.focus();
      cleanup(() => {
        this.document.body.style.overflow = previousOverflow;
        this.restoreFocus();
      });
    });
    effect((cleanup) => {
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(viewport);
      cleanup(() => observer.disconnect());
    });
  }

  protected dismissBackdrop(event: MouseEvent): void {
    if (this.mobile() && event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.visible.set(false);
  }

  protected restoreFocus(): void {
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = undefined;
  }

  protected loaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.natural.set({ width: image.naturalWidth, height: image.naturalHeight });
    this.measure();
  }

  private measure(): void {
    const viewport = this.viewport()?.nativeElement;
    const image = this.natural();
    if (!viewport || !image.width || !image.height) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    this.viewportSize.set({ width, height });
    const ratio = Math.min(
      1,
      Math.max(1, width - 32) / image.width,
      Math.max(1, height - 32) / image.height,
    );
    this.fit.set({ width: image.width * ratio, height: image.height * ratio });
    this.pan.set({ x: 0, y: 0 });
  }

  protected zoomBy(step: number): void {
    this.zoom.set(Math.max(25, Math.min(400, this.zoom() + step)));
    this.pan.set({ x: 0, y: 0 });
  }

  protected reset(): void {
    this.zoom.set(100);
    this.pan.set({ x: 0, y: 0 });
    this.dragging.set(false);
    this.drag = undefined;
    this.pointers.clear();
    this.pinch = undefined;
  }

  private moveTo(x: number, y: number): void {
    // Overflow can be explored; smaller dimensions can move within the spare space.
    const maxX = Math.abs(this.size().width - this.viewportSize().width) / 2;
    const maxY = Math.abs(this.size().height - this.viewportSize().height) / 2;
    this.pan.set({ x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) });
  }

  protected startDrag(event: PointerEvent): void {
    if (event.button !== 0 || (!this.canPan() && event.pointerType !== 'touch')) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: this.zoom(),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        panX: this.pan().x,
        panY: this.pan().y,
      };
      this.drag = undefined;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: this.pan().x,
      originY: this.pan().y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging.set(true);
  }

  protected moveDrag(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const viewport = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const gesture = this.pinch;
      this.zoom.set(
        Math.round(
          Math.max(
            100,
            Math.min(
              400,
              (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, gesture.distance),
            ),
          ),
        ),
      );
      const ratio = this.zoom() / gesture.zoom;
      this.moveTo(
        (a.x + b.x) / 2 -
          viewport.left -
          viewport.width / 2 -
          (gesture.x - viewport.left - viewport.width / 2 - gesture.panX) * ratio,
        (a.y + b.y) / 2 -
          viewport.top -
          viewport.height / 2 -
          (gesture.y - viewport.top - viewport.height / 2 - gesture.panY) * ratio,
      );
      return;
    }
    if (this.drag?.id !== event.pointerId) return;
    this.moveTo(
      this.drag.originX + event.clientX - this.drag.x,
      this.drag.originY + event.clientY - this.drag.y,
    );
  }

  protected endDrag(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.pinch = undefined;
    const remaining = [...this.pointers.entries()][0];
    if (remaining) {
      this.drag = {
        id: remaining[0],
        x: remaining[1].x,
        y: remaining[1].y,
        originX: this.pan().x,
        originY: this.pan().y,
      };
      return;
    }
    this.drag = undefined;
    this.dragging.set(false);
    const viewport = event.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
  }

  protected keyPan(event: KeyboardEvent): void {
    if (!this.canPan()) return;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-40, 0],
      ArrowRight: [40, 0],
      ArrowUp: [0, -40],
      ArrowDown: [0, 40],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    this.moveTo(this.pan().x + offset[0], this.pan().y + offset[1]);
  }
}
