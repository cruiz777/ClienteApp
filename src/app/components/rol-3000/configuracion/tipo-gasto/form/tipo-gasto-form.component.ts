import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { TipoGastoService } from 'src/app/services/tipo-gasto.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoGastoResponse } from 'src/app/interfaces/responses/tipo-gasto-response';
import { CreateTipoGastoRequest } from 'src/app/interfaces/requests/tipo-gasto-resquest';

@Component({
  selector: 'app-tipo-gasto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-gasto-form.component.html',
  styleUrls: ['./tipo-gasto-form.component.css']
})
export class TipoGastoFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private tipoGastoService: TipoGastoService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoGastoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idTipoGasto: [0],
      descripcion: ['', [Validators.required, Validators.maxLength(248)]],
      monto:       ['', [Validators.maxLength(50)]],
      estado:      [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoGastoService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<TipoGastoResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de gasto.',
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

    const payload: CreateTipoGastoRequest = {
      descripcion: (raw.descripcion ?? '').trim() || null,
      monto:       raw.monto?.trim() || null,
      estado:      raw.estado,
    };

    const req$ = this.isEditMode
      ? this.tipoGastoService.update(raw.idTipoGasto, payload)
      : this.tipoGastoService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de gasto ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de gasto.`;
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