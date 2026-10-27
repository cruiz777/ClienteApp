import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { TipoNominaEspService } from 'src/app/services/rol/tipo-nomina-esp.service';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { CreateTipoNominaEspRequest } from 'src/app/interfaces/requests/tipo-nomina-esp-request';

@Component({
  selector: 'app-tipo-nomina-esp-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-nomina-esp-form.component.html',
  styleUrls: ['./tipo-nomina-esp-form.component.css']
})
export class TipoNominaEspFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private tipoNominaEspService: TipoNominaEspService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoNominaEspFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idTipoNomEsp: [0],
      descripcion:  ['', [Validators.required, Validators.maxLength(248)]],
      estado:       [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoNominaEspService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<TipoNominaEspResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de nómina especial.',
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

    const payload: CreateTipoNominaEspRequest = {
      descripcion: (raw.descripcion ?? '').trim() || null,
      estado:      raw.estado,
    };

    const req$ = this.isEditMode
      ? this.tipoNominaEspService.update(raw.idTipoNomEsp, payload)
      : this.tipoNominaEspService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de nómina especial ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de nómina especial.`;
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