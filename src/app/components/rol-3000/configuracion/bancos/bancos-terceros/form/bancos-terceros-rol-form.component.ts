import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpBanTerceroService } from 'src/app/services/rol/bancos-terceros-rol.service';
import { RpBanTerceroResponse } from 'src/app/interfaces/responses/bancos-terceros-rol-response';
import { CreateRpBanTerceroRequest } from 'src/app/interfaces/requests/bancos-terceros-rol-request';

@Component({
  selector: 'app-rp-ban-tercero-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './bancos-terceros-rol-form.component.html',
  styleUrls: ['./bancos-terceros-rol-form.component.css']
})
export class RpBanTerceroFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpBanTerceroService: RpBanTerceroService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpBanTerceroFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codBanTercero: [0],
      descripcion:   ['', [Validators.required, Validators.maxLength(248)]],
      estado:        [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpBanTerceroService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpBanTerceroResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el banco tercero.',
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

    const payload: CreateRpBanTerceroRequest = {
      descripcion: (raw.descripcion ?? '').trim(),
      estado:      raw.estado,
    };

    const req$ = this.isEditMode
      ? this.rpBanTerceroService.update(raw.codBanTercero, payload)
      : this.rpBanTerceroService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Banco tercero ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el banco tercero.`;
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