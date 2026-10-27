import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { ImpuestoRentaService } from 'src/app/services/impuestos-renta-rol.service';
import { ImpuestoRentaResponse } from 'src/app/interfaces/responses/impuesto-renta-rol-request';
import { CreateImpuestoRentaRequest } from 'src/app/interfaces/requests/impuesto-renta-rol-request';

@Component({
  selector: 'app-impuesto-renta-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './impuestos-renta-form.component.html',
  styleUrls: ['./impuestos-renta-form.component.css']
})
export class ImpuestoRentaFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private impuestoRentaService: ImpuestoRentaService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<ImpuestoRentaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idImpRenta: [0],
      frabas1Ir:  [null],
      frabas2Ir:  [null],
      impbasIr:   [null],
      porexdIr:   [null],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.impuestoRentaService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<ImpuestoRentaResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el impuesto de renta.',
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

    const payload: CreateImpuestoRentaRequest = {
      frabas1Ir: raw.frabas1Ir != null ? Number(raw.frabas1Ir) : null,
      frabas2Ir: raw.frabas2Ir != null ? Number(raw.frabas2Ir) : null,
      impbasIr:  raw.impbasIr  != null ? Number(raw.impbasIr)  : null,
      porexdIr:  raw.porexdIr  != null ? Number(raw.porexdIr)  : null,
    };

    const req$ = this.isEditMode
      ? this.impuestoRentaService.update(raw.idImpRenta, payload)
      : this.impuestoRentaService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Impuesto de renta ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el impuesto de renta.`;
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