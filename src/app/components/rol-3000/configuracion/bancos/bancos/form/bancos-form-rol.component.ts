import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpBancosService } from 'src/app/services/rol/bancos-rol.service';
import { RpBancosResponse } from 'src/app/interfaces/responses/bancos-rol-response';
import { CreateRpBancosRequest } from 'src/app/interfaces/requests/bancos-rol-request';

@Component({
  selector: 'app-rp-bancos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './bancos-form-rol.component.html',
  styleUrls: ['./bancos-form-rol.component.css']
})
export class RpBancosFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpBancosService: RpBancosService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpBancosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codban:          [0],
      desban:          ['', [Validators.required, Validators.maxLength(248)]],
      codcue:          ['', [Validators.maxLength(50)]],
      ctacontabilidad: ['', [Validators.maxLength(50)]],
      desban2:         ['', [Validators.maxLength(248)]],
      codigoEspeacial: ['', [Validators.maxLength(50)]],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpBancosService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpBancosResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el banco.',
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

    const payload: CreateRpBancosRequest = {
      desban:          (raw.desban ?? '').trim(),
      codcue:          raw.codcue?.trim() || null,
      ctacontabilidad: raw.ctacontabilidad?.trim() || null,
      desban2:         raw.desban2?.trim() || null,
      codigoEspeacial: raw.codigoEspeacial?.trim() || null,
    };

    const req$ = this.isEditMode
      ? this.rpBancosService.update(raw.codban, payload)
      : this.rpBancosService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Banco ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el banco.`;
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