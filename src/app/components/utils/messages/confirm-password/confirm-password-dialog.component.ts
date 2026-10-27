import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmPasswordData {
  title?: string;
  message?: string;
  motivoRequerido?: boolean;
  motivoLabel?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmPasswordResult {
  password: string;
  motivo?: string;
}

@Component({
  selector: 'app-confirm-password-dialog',
  templateUrl: './confirm-password-dialog.component.html',
  styleUrls: ['./confirm-password-dialog.component.scss']
})
export class ConfirmPasswordDialogComponent {
  form: FormGroup;
  mostrarPassword = false;
  cargando = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ConfirmPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmPasswordData
  ) {
    this.dialogRef.disableClose = true;

    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(1)]],
      motivo: [
        '',
        this.data.motivoRequerido ? [Validators.required, Validators.minLength(5)] : []
      ]
    });
  }

  onConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result: ConfirmPasswordResult = {
      password: this.form.value.password,
      motivo: this.form.value.motivo || undefined
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  get passwordError(): string {
    const ctrl = this.form.get('password');
    if (ctrl?.hasError('required')) return 'La contraseña es obligatoria';
    return '';
  }

  get motivoError(): string {
    const ctrl = this.form.get('motivo');
    if (ctrl?.hasError('required')) return 'El motivo es obligatorio';
    if (ctrl?.hasError('minlength')) return 'Mínimo 5 caracteres';
    return '';
  }
}