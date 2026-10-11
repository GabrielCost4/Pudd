import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';
describe('Pagination', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const f = TestBed.createComponent(Pagination);
    const changed = vi.fn();
    f.componentInstance.changed.subscribe(changed);
    f.componentRef.setInput('page', 2);
    f.componentRef.setInput('hasNext', true);
    f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    expect(changed.mock.calls).toEqual([[1], [3]]);
    f.componentRef.setInput('busy', true);
    f.detectChanges();
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });
});
