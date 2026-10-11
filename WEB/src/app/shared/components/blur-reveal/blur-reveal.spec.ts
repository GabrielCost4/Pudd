import { TestBed } from '@angular/core/testing';
import { BlurReveal } from './blur-reveal';
describe('BlurReveal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(BlurReveal);
    f.componentRef.setInput('delay', 0.4);
    f.componentRef.setInput('duration', 1.2);
    f.detectChanges();
    expect(f.nativeElement.style.getPropertyValue('--reveal-delay')).toBe('0.4s');
    expect(f.nativeElement.style.getPropertyValue('--reveal-duration')).toBe('1.2s');
  });
});
