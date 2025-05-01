import { AbstractControl, ValidationErrors } from '@angular/forms';

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

}
