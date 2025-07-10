import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appUppercase]'
})
export class UppercaseDirective {

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    console.log('Directiva ejecutándose');
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.toUpperCase();
    
    // Restaurar posición del cursor
    input.setSelectionRange(start || 0, end || 0);
  }
}