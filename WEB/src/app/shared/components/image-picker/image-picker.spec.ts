import { TestBed } from '@angular/core/testing';
import { ImagePicker } from './image-picker';
describe('ImagePicker', () => {
  beforeEach(() => {
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
  it('emits an image, shows a preview and releases it on discard', () => {
    const { f, selected, input } = setup();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    choose(input, file);
    f.detectChanges();
    expect(selected).toHaveBeenCalledWith(file);
    expect(f.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:preview');
    f.nativeElement.querySelector('button').click();
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
});
