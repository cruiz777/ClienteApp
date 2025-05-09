import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appUppercase]'
})
export class UppercaseDirective {
  constructor(private control: NgControl) {
    if (!control) {
      console.warn('⚠️ appUppercase usado sin FormControl');
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const originalValue = input.value;

  // Verifica que el control exista y tenga un valor válido
  if (!this.control?.control || originalValue === null || originalValue === undefined) {
    return;
  }

  const uppercaseValue = originalValue.toUpperCase();

  // Solo actualizar si es diferente y el control no está destruido
  if (uppercaseValue !== originalValue) {
    try {
      this.control.control.setValue(uppercaseValue, { emitEvent: false });
    } catch (err) {
      console.warn('⚠️ Error al aplicar mayúsculas:', err);
    }
  }
}

}
