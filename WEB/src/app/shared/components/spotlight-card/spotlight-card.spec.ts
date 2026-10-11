import { TestBed } from '@angular/core/testing';
import { SpotlightCard } from './spotlight-card';
describe('SpotlightCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(SpotlightCard);
    f.detectChanges();
    vi.spyOn(f.nativeElement, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
    } as DOMRect);
    const event = new Event('pointermove');
    Object.defineProperties(event, { clientX: { value: 35 }, clientY: { value: 50 } });
    f.nativeElement.dispatchEvent(event);
    f.detectChanges();
    expect(f.nativeElement.style.getPropertyValue('--spot-x')).toBe('25px');
    expect(f.nativeElement.style.getPropertyValue('--spot-y')).toBe('30px');
  });
});
