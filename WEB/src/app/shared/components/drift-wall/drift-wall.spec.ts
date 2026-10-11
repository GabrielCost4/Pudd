import { TestBed } from '@angular/core/testing';
import { DriftWall } from './drift-wall';
describe('DriftWall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
    const f = TestBed.createComponent(DriftWall);
    f.componentRef.setInput('images', ['https://example.test/image.png']);
    f.componentRef.setInput('paused', true);
    f.detectChanges();
    TestBed.tick();
    f.detectChanges();
    expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.nativeElement.classList.contains('paused')).toBe(true);
    expect(f.nativeElement.getAttribute('aria-hidden')).toBe('true');
    f.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
