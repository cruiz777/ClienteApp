import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpTipEmpService } from 'src/app/services/tipo-empleado.service';
import { RpTipEmpResponse } from 'src/app/interfaces/responses/tipo-empleado-response';
import { CreateRpTipEmpRequest } from 'src/app/interfaces/requests/tipo-empleado.request';

@Component({
  selector: 'app-tipo-empleado-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipo-empleado-form.component.html',
  styleUrls: ['./tipo-empleado-form.component.css']
})
export class TipoEmpleadoFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpTipEmpService: RpTipEmpService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoEmpleadoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idTipemp:    [0],
      desTipemp:   ['', [Validators.required, Validators.maxLength(248)]],
      ctaCbleSue1: ['', [Validators.maxLength(50)]],
      ctaCbleSue2: ['', [Validators.maxLength(50)]],
      ctaCbleSue3: ['', [Validators.maxLength(50)]],
      ctaCbleSue4: ['', [Validators.maxLength(50)]],
      ctaCbleSue5: ['', [Validators.maxLength(50)]],
      swRelDep:    [false],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpTipEmpService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpTipEmpResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de empleado.',
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

    const payload: CreateRpTipEmpRequest = {
      desTipemp:   (raw.desTipemp ?? '').trim(),
      ctaCbleSue1: raw.ctaCbleSue1?.trim() || null,
      ctaCbleSue2: raw.ctaCbleSue2?.trim() || null,
      ctaCbleSue3: raw.ctaCbleSue3?.trim() || null,
      ctaCbleSue4: raw.ctaCbleSue4?.trim() || null,
      ctaCbleSue5: raw.ctaCbleSue5?.trim() || null,
      swRelDep:    raw.swRelDep,
    };

    const req$ = this.isEditMode
      ? this.rpTipEmpService.update(raw.idTipemp, payload)
      : this.rpTipEmpService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de empleado ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de empleado.`;
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