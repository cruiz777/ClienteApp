import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpFormaPagoService } from 'src/app/services/rol/forma-pago-rol.service';
import { RpFormaPagoResponse } from 'src/app/interfaces/responses/forma-pago-rol-response';
import { CreateRpFormaPagoRequest } from 'src/app/interfaces/requests/forma-pago-rol-request';

@Component({
  selector: 'app-forma-pago-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './forma-pago-form-rol.component.html',
  styleUrls: ['./forma-pago-form-rol.component.css']
})
export class RpFormaPagoRolFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpFormaPagoService: RpFormaPagoService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpFormaPagoRolFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idFormaPago: [0],
      descripcion: ['', [Validators.required, Validators.maxLength(248)]],
      estado:      [true]
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpFormaPagoService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpFormaPagoResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la forma de pago.',
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

    const payload: CreateRpFormaPagoRequest = {
      descripcion: (raw.descripcion ?? '').trim(),
      estado:      raw.estado
    };

    const req$ = this.isEditMode
      ? this.rpFormaPagoService.update(raw.idFormaPago, payload)
      : this.rpFormaPagoService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Forma de pago ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la forma de pago.`;
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