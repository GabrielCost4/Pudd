import { TestBed } from '@angular/core/testing';
import { Button } from './button';
describe('Button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(Button);
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    expect(f.nativeElement.getAttribute('aria-busy')).toBe('true');
    expect(f.nativeElement.querySelector('app-spinner')).not.toBeNull();
    f.componentRef.setInput('busy', false);
    f.detectChanges();
    expect(f.nativeElement.getAttribute('aria-busy')).toBe('false');
    expect(f.nativeElement.querySelector('app-spinner')).toBeNull();
  });
});
