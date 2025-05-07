import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  // Solo letras (con tildes y ñ)
  static onlyLetters(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
      return { onlyLetters: true };
    }
    return null;
  }

  // Solo números
  static onlyNumbers(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value && !/^\d+$/.test(value)) {
      return { onlyNumbers: true };
    }
    return null;
  }
  static onlyLettersKeyPress(event: KeyboardEvent): void {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
    const inputChar = event.key;
    if (!regex.test(inputChar)) {
      event.preventDefault();
    }
  }

  static onlyNumbersKeyPress(event: KeyboardEvent): void {
    const regex = /^[0-9]*$/;
    const inputChar = event.key;
    if (!regex.test(inputChar)) {
      event.preventDefault();
    }
  }

  static exactLengthByTipoDocumento(descripcionControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;

      const tipo = control.parent.get(descripcionControlName)?.value;
      if (!tipo) return null;

      let expectedLength = 20;
      switch (tipo) {
        case 'CÉDULA': expectedLength = 10; break;
        case 'RUC': expectedLength = 13; break;
        case 'PASAPORTE': expectedLength = 20; break;
      }

      const value = control.value || '';
      return value.length === expectedLength
        ? null
        : { exactLengthByTipo: { expected: expectedLength, actual: value.length } };
    };
  }


  static limitInputByTipoDocumento(tipoControlName: string): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      const input = event.target as HTMLInputElement;
      const parent = input.closest('form');
      if (!parent) return;

      const tipoInput = parent.querySelector(`[formcontrolname="${tipoControlName}"]`) as HTMLSelectElement;
      const tipo = tipoInput?.value;
      let maxLength = 20;

      switch (tipo) {
        case 'CÉDULA': maxLength = 10; break;
        case 'RUC': maxLength = 13; break;
        case 'PASAPORTE': maxLength = 20; break;
      }

      if (input.value.length >= maxLength && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
    };
  }

  static limitInputLength(event: KeyboardEvent, maxLength: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Permite teclas especiales (flechas, borrar, etc.)
    if (
      event.key === 'Backspace' ||
      event.key === 'Delete' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (value.length >= maxLength) {
      event.preventDefault();
    }
  }
}
