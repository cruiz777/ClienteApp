import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { CreateRpRegimenRequest, UpdateRpRegimenRequest } from 'src/app/interfaces/requests/regimen-request';
import { RpRegimenService } from 'src/app/services/rol/regimen.service';

@Component({
  selector: 'app-regimen-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './regimen-form.component.html',
  styleUrls: ['./regimen-form.component.css']
})
export class RpRegimenFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpRegimenService: RpRegimenService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpRegimenFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id_regimen:  [0],
      descripcion: ['', [Validators.required, Validators.maxLength(248)]],
      estado:      [true]
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpRegimenService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpRegimenResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el régimen.',
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

    const req$ = this.isEditMode
      ? this.rpRegimenService.update(raw.id_regimen, {
          id_regimen:  raw.id_regimen,
          descripcion: (raw.descripcion ?? '').trim(),
          estado:      raw.estado
        } as UpdateRpRegimenRequest)
      : this.rpRegimenService.create({
          descripcion: (raw.descripcion ?? '').trim(),
          estado:      raw.estado
        } as CreateRpRegimenRequest);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Régimen ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el régimen.`;
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