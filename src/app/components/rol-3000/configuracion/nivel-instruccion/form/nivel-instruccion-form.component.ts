import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpNivelInstruccionService } from 'src/app/services/nivel-instruccion.service';
import { RpNivelInstruccionResponse } from 'src/app/interfaces/responses/nivel-instruccion.response';
import { CreateRpNivelInstruccionRequest, UpdateRpNivelInstruccionRequest } from 'src/app/interfaces/requests/nivel-instruccion-request';

@Component({
  selector: 'app-rp-nivel-instruccion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './nivel-instruccion-form.component.html',
  styleUrls: ['./nivel-instruccion-form.component.css']
})
export class RpNivelInstruccionFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpNivelInstruccionService: RpNivelInstruccionService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpNivelInstruccionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id_nivel_instruccion: [0],
      descripcion:          ['', [Validators.required, Validators.maxLength(248)]],
      estado:               [true],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpNivelInstruccionService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpNivelInstruccionResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el nivel de instrucción.',
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
      ? this.rpNivelInstruccionService.update(raw.id_nivel_instruccion, {
          id_nivel_instruccion: raw.id_nivel_instruccion,
          descripcion:          (raw.descripcion ?? '').trim(),
          estado:               raw.estado,
        } as UpdateRpNivelInstruccionRequest)
      : this.rpNivelInstruccionService.create({
          descripcion: (raw.descripcion ?? '').trim(),
          estado:      raw.estado,
        } as CreateRpNivelInstruccionRequest);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Nivel de instrucción ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el nivel de instrucción.`;
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