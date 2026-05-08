import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ParametrosCostosService } from 'src/app/services/parametros-costos.service';
import { ParametrosCostosResponse } from 'src/app/interfaces/responses/parametros-costos.response';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { CreateParametrosCostosRequest } from 'src/app/interfaces/requests/parametros-costos-request';

@Component({
  selector: 'app-parametros-costos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './parametros-costos-form.component.html',
  styleUrls: ['./parametros-costos-form.component.css']
})
export class ParametrosCostosFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private parametrosCostosService: ParametrosCostosService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<ParametrosCostosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idParCosto:   [0],
      nombre:       ['', [Validators.required, Validators.maxLength(248)]],
      valorInicial: ['', [Validators.maxLength(100)]],
      valorFinal:   ['', [Validators.maxLength(100)]],
      descripcion:  ['', [Validators.maxLength(500)]],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.parametrosCostosService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<ParametrosCostosResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el parámetro de costo.',
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

    const payload: CreateParametrosCostosRequest = {
      nombre:       (raw.nombre ?? '').trim() || null,
      valorInicial: raw.valorInicial?.trim() || null,
      valorFinal:   raw.valorFinal?.trim() || null,
      descripcion:  raw.descripcion?.trim() || null,
    };

    const req$ = this.isEditMode
      ? this.parametrosCostosService.update(raw.idParCosto, payload)
      : this.parametrosCostosService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Parámetro de costo ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el parámetro de costo.`;
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