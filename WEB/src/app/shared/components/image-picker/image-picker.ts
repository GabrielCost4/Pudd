import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  SecurityContext,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ImageViewer } from '../image-viewer/image-viewer';
import type { FileSelectEvent } from 'primeng/types/fileupload';

@Component({
  selector: 'app-image-picker',
  imports: [ButtonModule, FileUploadModule, MessageModule, ImageViewer],
  templateUrl: './image-picker.html',
  styleUrl: './image-picker.css',
})
export class ImagePicker {
  protected readonly previewVisible = signal(false);
  private readonly sanitizer = inject(DomSanitizer);
  readonly disabled = input(false);
  readonly selected = output<File | null>();
  protected readonly preview = signal('');
  protected readonly filename = signal('');
  protected readonly error = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  private release(): void {
    this.previewVisible.set(false);
    if (this.preview()) URL.revokeObjectURL(this.preview());
  }

  protected choose(event: FileSelectEvent, picker: FileUpload): void {
    if (this.disabled()) return;
    const file = Array.from(event.files)[0] as (File & { objectURL?: SafeUrl }) | undefined;
    if (!file) return;
    this.error.set('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.error.set('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
      picker.clear();
      return;
    }
    this.release();
    // Reutiliza a URL criada pelo PrimeNG e a libera ao trocar ou descartar a imagem.
    const preview = file.objectURL
      ? this.sanitizer.sanitize(SecurityContext.URL, file.objectURL)
      : null;
    this.preview.set(preview || URL.createObjectURL(file));
    this.filename.set(file.name);
    this.selected.emit(file);
    // A página envia o FormData; FileUpload atua somente na seleção local.
    picker.clear();
  }

  protected clear(): void {
    if (this.disabled()) return;
    this.release();
    this.preview.set('');
    this.filename.set('');
    this.error.set('');
    this.selected.emit(null);
  }
}
