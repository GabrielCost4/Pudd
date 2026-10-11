import { TestBed } from '@angular/core/testing';
import { Feedback } from './feedback';
describe('Feedback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(Feedback);
    f.componentRef.setInput('errors', ['Invalid email', 'Invalid password']);
    f.componentRef.setInput('success', 'Saved');
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid email');
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Invalid password',
    );
    expect(f.nativeElement.querySelector('[role="status"]').textContent).toContain('Saved');
    f.componentRef.setInput('errors', []);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
