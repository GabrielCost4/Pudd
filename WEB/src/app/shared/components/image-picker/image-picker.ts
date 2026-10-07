import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';

@Component({ selector:'app-image-picker', templateUrl:'./image-picker.html', styleUrl:'./image-picker.css' })
export class ImagePicker {
  readonly disabled = input(false);
  readonly selected = output<File | null>();
  protected readonly preview = signal('');
  protected readonly filename = signal('');
  protected readonly error = signal('');
  constructor() { inject(DestroyRef).onDestroy(() => this.release()); }
  private release(): void { if(this.preview()) URL.revokeObjectURL(this.preview()); }
  protected choose(event: Event): void {
    const control = event.target as HTMLInputElement;
    const file = control.files?.[0];
    if(!file) return;
    this.error.set('');
    // Ajuda de preenchimento; a API continua inspecionando o arquivo recebido.
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
      control.value = ''; return;
    }
    this.release(); this.preview.set(URL.createObjectURL(file)); this.filename.set(file.name);
    this.selected.emit(file);
  }
  protected clear(control: HTMLInputElement): void {
    this.release(); this.preview.set(''); this.filename.set(''); this.error.set('');
    control.value = ''; this.selected.emit(null);
  }
}
