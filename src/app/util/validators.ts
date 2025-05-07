import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailValidoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;

    if (!valor) return null; // permite vacío si no es obligatorio

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const valido = regex.test(valor);

    return valido ? null : { emailInvalido: true };
  };
}
