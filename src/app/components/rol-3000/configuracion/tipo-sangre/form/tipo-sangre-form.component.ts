import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpTipoSangreResponse } from 'src/app/interfaces/responses/tipo-sangre-response';
import { CreateRpTipoSangreRequest } from 'src/app/interfaces/requests/tipo-sangre-request';
import { RpTipoSangreService } from 'src/app/services/rol/tipo-sangre.service';

@Component({
  selector: 'app-tipo-sangre-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-sangre-form.component.html',
  styleUrls: ['./tipo-sangre-form.component.css']
})
export class RpTipoSangreFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpTipoSangreService: RpTipoSangreService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpTipoSangreFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idTipoSangre: [0],
      descripcion:  ['', [Validators.required, Validators.maxLength(100)]]
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpTipoSangreService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpTipoSangreResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de sangre.',
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

    const payload: CreateRpTipoSangreRequest = {
      descripcion: (raw.descripcion ?? '').trim()
    };

    const req$ = this.isEditMode
      ? this.rpTipoSangreService.update(raw.idTipoSangre, payload)
      : this.rpTipoSangreService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de sangre ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de sangre.`;
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