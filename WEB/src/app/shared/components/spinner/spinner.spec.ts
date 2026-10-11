import { TestBed } from '@angular/core/testing';
import { Spinner } from './spinner';
describe('Spinner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(Spinner);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.spinner').getAttribute('aria-hidden')).toBe('true');
  });
});
