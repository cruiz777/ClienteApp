import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailValidoValidator(): ValidatorFn {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return (control: AbstractControl): ValidationErrors | null => {
    const valor: string = (control.value ?? '').toString().trim();
    if (!valor) return null; // permite vacío
    return regex.test(valor) ? null : { emailInvalido: true };
  };
}

export function multipleEmailsValidator(opts?: { max?: number; separators?: RegExp }): ValidatorFn {
  const max = opts?.max ?? Infinity;
  const sep: RegExp = opts?.separators ?? /[;,]+/;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  return (control: AbstractControl): ValidationErrors | null => {
    const raw: string = (control.value ?? '').toString().trim();
    if (!raw) return null;

    // ↓ Tipos explícitos en map/filter:
    const emails: string[] = raw
      .split(sep)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    if (emails.length > max) {
      return { tooManyEmails: { count: emails.length, max } };
    }

    const invalid: string[] = emails.filter((e: string) => !emailRe.test(e));
    if (invalid.length) {
      return { multipleEmails: { invalid } };
    }

    return null;
  };
}
