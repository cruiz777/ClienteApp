import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoCuentaBancoService } from 'src/app/services/rol/tipo-cuenta.service';
import { TipoCuentaBancoResponse } from 'src/app/interfaces/responses/tipo-cuenta-response';
import { CreateTipoCuentaBancoRequest } from 'src/app/interfaces/requests/tipo-cuenta-request';

@Component({
  selector: 'app-tipo-cuenta-banco-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-cuenta-form.component.html',
  styleUrls: ['./tipo-cuenta-form.component.css']
})
export class TipoCuentaBancoFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private tipoCuentaBancoService: TipoCuentaBancoService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoCuentaBancoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idCuentaBanco:  [0],
      desCuentaBanco: ['', [Validators.required, Validators.maxLength(248)]],
      estado:         [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoCuentaBancoService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<TipoCuentaBancoResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de cuenta banco.',
          showCancel: false,
          confirmText: 'Aceptar'
        })
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false,
        confirmText: 'Aceptar'
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateTipoCuentaBancoRequest = {
      desCuentaBanco: (raw.desCuentaBanco ?? '').trim(),
      estado:         raw.estado,
    };

    const req$ = this.isEditMode
      ? this.tipoCuentaBancoService.update(raw.idCuentaBanco, payload)
      : this.tipoCuentaBancoService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de cuenta banco ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de cuenta banco.`;
        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: msg,
          showCancel: false,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    });
  }
}