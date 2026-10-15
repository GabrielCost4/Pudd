import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ImagePicker } from './image-picker';
describe('ImagePicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:preview');
        static override revokeObjectURL = vi.fn();
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  function setup() {
    const f = TestBed.createComponent(ImagePicker);
    f.detectChanges();
    const selected = vi.fn();
    f.componentInstance.selected.subscribe(selected);
    const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    return { f, selected, input };
  }
  function choose(input: HTMLInputElement, file: File) {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }
  function drop(element: HTMLElement, file: File) {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
    element.dispatchEvent(event);
  }
  it('opens the native chooser through the dropzone button', () => {
    const { f, input } = setup();
    const click = vi.spyOn(input, 'click');
    f.nativeElement.querySelector('.dropzone-choose').click();
    expect(click).toHaveBeenCalledOnce();
  });
  it('accepts a dropped image and keeps it when an invalid replacement is dropped', () => {
    const { f, selected } = setup();
    const zone = f.nativeElement.querySelector('.dropzone') as HTMLElement;
    const file = new File(['image'], 'dropped.png', { type: 'image/png' });
    drop(zone, file);
    f.detectChanges();
    expect(selected).toHaveBeenLastCalledWith(file);
    expect(f.nativeElement.querySelector('.preview').textContent).toContain('dropped.png');
    drop(zone, new File(['text'], 'invalid.txt', { type: 'text/plain' }));
    f.detectChanges();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(f.nativeElement.querySelector('.preview').textContent).toContain('dropped.png');
    expect(f.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    f.destroy();
  });
  it('ignores drops while the parent is busy', () => {
    const { f, selected } = setup();
    f.componentRef.setInput('disabled', true);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dropzone-choose').disabled).toBe(true);
    drop(
      f.nativeElement.querySelector('.dropzone'),
      new File(['image'], 'dropped.png', { type: 'image/png' }),
    );
    f.detectChanges();
    expect(selected).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.preview')).toBeNull();
  });
  it('emits an image, shows a preview and releases it on discard', () => {
    const { f, selected, input } = setup();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    choose(input, file);
    f.detectChanges();
    expect(selected).toHaveBeenCalledWith(file);
    expect(f.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:preview');
    f.nativeElement.querySelector('.preview button:last-child').click();
    f.detectChanges();
    expect(selected).toHaveBeenLastCalledWith(null);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(f.nativeElement.querySelector('img')).toBeNull();
  });
  it.each([
    new File(['text'], 'file.txt', { type: 'text/plain' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
  ])('rejects unsupported or oversized files', (file) => {
    const { f, selected, input } = setup();
    choose(input, file);
    f.detectChanges();
    expect(selected).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('5 MB');
  });
  it('releases the preview when destroyed', () => {
    const { f, input } = setup();
    choose(input, new File(['image'], 'photo.png', { type: 'image/png' }));
    f.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
  it('reuses the PrimeNG preview and releases it when replacing the selection', () => {
    const { f, input, selected } = setup();
    const file = new File(['image'], 'first.png', { type: 'image/png' });
    choose(input, file);
    f.detectChanges();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    choose(input, new File(['other image'], 'second.png', { type: 'image/png' }));
    f.detectChanges();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(selected).toHaveBeenCalledTimes(2);
    expect(f.nativeElement.querySelector('.preview').textContent).toContain('second.png');
    f.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it('keeps the current selection when a replacement is rejected', () => {
    const { f, input, selected } = setup();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    choose(input, file);
    choose(input, new File(['text'], 'file.txt', { type: 'text/plain' }));
    f.detectChanges();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(selected).toHaveBeenLastCalledWith(file);
    expect(f.nativeElement.querySelector('.preview').textContent).toContain('photo.png');
    expect(f.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    f.destroy();
  });
  it('disables image selection and discard while the parent is busy', () => {
    const { f, input } = setup();
    choose(input, new File(['image'], 'photo.png', { type: 'image/png' }));
    f.componentRef.setInput('disabled', true);
    f.detectChanges();
    expect(input.disabled).toBe(true);
    expect(
      Array.from(
        f.nativeElement.querySelectorAll('.preview button') as NodeListOf<HTMLButtonElement>,
      ).every((button) => button.disabled),
    ).toBe(true);
    f.destroy();
  });
});
