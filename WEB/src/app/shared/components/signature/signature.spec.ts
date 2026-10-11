import { TestBed } from '@angular/core/testing';
import { Signature } from './signature';
describe('Signature', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(Signature);
    f.componentRef.setInput('text', 'Member');
    f.componentRef.setInput('fontSize', 60);
    f.detectChanges();
    const svg = f.nativeElement.querySelector('svg');
    expect(svg.getAttribute('aria-label')).toBe('Member');
    expect(svg.getAttribute('height')).toBe('60');
    expect(svg.querySelector('text').textContent).toContain('Member');
  });
});
