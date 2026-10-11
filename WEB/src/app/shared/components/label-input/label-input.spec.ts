import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { LabelInput } from './label-input';
describe('LabelInput', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('updates its visible behavior when the user or inputs change', () => {
    const control = new FormControl('', { nonNullable: true });
    const f = TestBed.createComponent(LabelInput);
    f.componentRef.setInput('control', control);
    f.componentRef.setInput('inputId', 'password');
    f.componentRef.setInput('label', 'Password');
    f.componentRef.setInput('type', 'password');
    f.detectChanges();
    const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'secret';
    input.dispatchEvent(new Event('input'));
    expect(control.value).toBe('secret');
    const toggle = f.nativeElement.querySelector('button') as HTMLButtonElement;
    toggle.click();
    f.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    control.disable();
    f.detectChanges();
    expect(input.disabled).toBe(true);
    expect(toggle.disabled).toBe(true);
  });
});
