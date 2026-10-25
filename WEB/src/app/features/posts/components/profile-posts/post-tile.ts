import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { PostService } from '../../services/post.service';
import type { Post } from '../../models/post';

@Component({
  selector: 'app-post-tile',
  imports: [ButtonModule, DatePipe],
  templateUrl: './post-tile.html',
  styleUrl: './post-tile.css',
})
export class PostTile {
  readonly post = input.required<Post>();
  readonly selected = output<Post>();
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(PostService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly url = signal('');
  protected readonly failed = signal(false);
  private request?: Subscription;

  constructor() {
    effect((cleanup) => {
      this.post();
      this.url.set('');
      this.failed.set(false);
      if (!this.post().hasImage) return;
      if (typeof IntersectionObserver === 'undefined') {
        this.load();
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            this.load();
          }
        },
        { rootMargin: '100px' },
      );
      observer.observe(this.host.nativeElement);
      cleanup(() => {
        observer.disconnect();
        this.request?.unsubscribe();
      });
    });
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.failed.set(false);
    this.request = this.api.image(this.post().id).subscribe({
      next: (image) => this.url.set(image.url),
      error: () => this.failed.set(true),
    });
  }
}
