import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: 'form[appSubmitOnEnter]',
  host: { '(keydown.enter)': 'submit($event)' },
})
export class SubmitOnEnter {
  private readonly host = inject<ElementRef<HTMLFormElement>>(ElementRef);

  protected submit(event: KeyboardEvent): void {
    if (
      event.isComposing ||
      event.repeat ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      (event.target as HTMLElement).tagName !== 'TEXTAREA'
    )
      return;
    event.preventDefault();
    const form = this.host.nativeElement;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button || button.disabled || form.getAttribute('aria-busy') === 'true') return;
    form.requestSubmit(button);
  }
}
