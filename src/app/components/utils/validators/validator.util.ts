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
  static onlyFormattedNumber(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (value == null || value === '') return null;

    const stringValue = value.toString().trim();

    // Aceptar números con:
    // - decimales (coma o punto)
    // - separador de miles opcional
    // Ejemplos válidos: 1,000.25 - 1.000,25 - 1234.56 - 1234,56 - 1234
    const regex = /^-?\d{1,3}([.,]\d{1,10})?$/;
    if (!regex.test(stringValue)) {
      return { onlyFormattedNumber: true };
    }

    // Normalización: quitar separadores de miles, usar punto como decimal
    const normalized = stringValue
      .replace(/\.(?=\d{3}(?:[.,]|$))/g, '') // elimina puntos de miles
      .replace(/,(?=\d{3}(?:[.,]|$))/g, '')  // elimina comas de miles
      .replace(',', '.'); // reemplaza coma decimal por punto

    const parsed = parseFloat(normalized);

    return isNaN(parsed) ? { onlyFormattedNumber: true } : null;
  }

  static alphanumericMaxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const regex = /^[a-zA-Z0-9]*$/;

      if (!regex.test(value)) {
        return { alphanumeric: true };
      }

      if (value.length > maxLength) {
        return { maxLength: true };
      }

      return null;
    };
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
  // Formato 000000-000
  static cuentaFormato(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Solo permitir el formato 000000-000
    const regex = /^\d{6}-\d{3}$/;
    if (!regex.test(value)) {
      return { cuentaFormato: true };
    }

    return null;
  }

static cuentaKeyPress(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const key = event.key;

  // Permitir teclas especiales
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(key)) return;

  const currentValue = input.value;

  // Prevenir letras o símbolos
  if (!/^\d$/.test(key)) {
    event.preventDefault();
    return;
  }

  // Agregar guion automáticamente en la posición 6
  if (currentValue.length === 6) {
    input.value += '-';
  }

  // Limitar longitud total a 10 caracteres (000000-000)
  if (currentValue.length >= 10) {
    event.preventDefault();
  }
}
}
