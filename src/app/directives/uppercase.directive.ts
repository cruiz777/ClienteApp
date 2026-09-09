import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appUppercase]'
})
export class UppercaseDirective {

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    
    setTimeout(() => {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      
      const currentValue = input.value;
      const upperValue = currentValue.toUpperCase();
      
      if (currentValue !== upperValue) {
        input.value = upperValue;
        input.setSelectionRange(start || 0, end || 0);
        
        // Disparar el evento input para que Angular reactive forms detecte el cambio
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 0);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    setTimeout(() => {
      const input = this.el.nativeElement as HTMLInputElement;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      
      input.value = input.value.toUpperCase();
      input.setSelectionRange(start || 0, end || 0);
      
      // Disparar el evento input para Angular reactive forms
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }
}