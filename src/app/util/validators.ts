import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailValidoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value ?? '').trim();
    if (!valor) return null; // permite vacío
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return regex.test(valor) ? null : { emailInvalido: true };
  };
}

export function multipleEmailsValidator(separators: RegExp = /[;,]/): ValidatorFn {
  const emailRe =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

  return (control: AbstractControl): ValidationErrors | null => {
    const raw: string = (control.value ?? '').trim();
    if (!raw) return null; // permite vacío

    const emails: string[] = raw
      .split(separators)
      .map((e: string) => e.trim())
      .filter(Boolean);

    const invalid: string[] = emails.filter((e: string) => !emailRe.test(e));
    return invalid.length ? { multipleEmails: { invalid } } : null;
  };
}
