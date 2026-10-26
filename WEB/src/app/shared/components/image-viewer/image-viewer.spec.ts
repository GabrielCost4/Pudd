import { TestBed } from '@angular/core/testing';
import { ImageViewer } from './image-viewer';

describe('ImageViewer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const fixture = TestBed.createComponent(ImageViewer);
    fixture.componentRef.setInput('src', '/photo.png');
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const viewport = root.querySelector<HTMLElement>('.viewport')!;
    Object.defineProperties(viewport, {
      clientWidth: { value: 320 },
      clientHeight: { value: 240 },
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: vi.fn() },
    });
    const image = root.querySelector('img')!;
    Object.defineProperties(image, {
      naturalWidth: { value: 300 },
      naturalHeight: { value: 1800 },
    });
    image.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    return { fixture, root, viewport, image };
  }

  function pointer(viewport: HTMLElement, type: string, x: number, y: number) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      button: { value: 0 },
      pointerId: { value: 1 },
      clientX: { value: x },
      clientY: { value: y },
    });
    viewport.dispatchEvent(event);
  }

  it('moves a tall zoomed image sideways within spare space and clamps vertical overflow', () => {
    const { fixture, root, viewport, image } = setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Ampliar imagem"]')!.click();
    fixture.detectChanges();
    pointer(viewport, 'pointerdown', 100, 100);
    pointer(viewport, 'pointermove', 180, 200);
    pointer(viewport, 'pointerup', 180, 200);
    fixture.detectChanges();
    expect(parseFloat(image.style.getPropertyValue('--pan-x'))).toBe(80);
    expect(parseFloat(image.style.getPropertyValue('--pan-y'))).toBeLessThanOrEqual(11);
    expect(viewport.classList.contains('dragging')).toBe(false);
    const reset = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Ajustar'),
    )!;
    reset.click();
    fixture.detectChanges();
    expect(root.querySelector('output')!.textContent).toContain('100%');
    expect(image.style.getPropertyValue('--pan-x')).toBe('0px');
    expect(viewport.classList.contains('can-pan')).toBe(false);
    fixture.destroy();
  });

  it('shows image loading failures and disables zoom without rotation controls', () => {
    const { fixture, root, image } = setup();
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain(
      'Não foi possível carregar',
    );
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Ampliar imagem"]')!.disabled).toBe(
      true,
    );
    expect(root.querySelector('[aria-label*="Girar"]')).toBeNull();
    fixture.destroy();
  });
});
