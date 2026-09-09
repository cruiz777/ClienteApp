import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { SectorialService } from 'src/app/services/sectorial.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { SectorialResponse } from 'src/app/interfaces/responses/sectorial-response';
import { CreateSectorialRequest } from 'src/app/interfaces/requests/sectorial-request';

@Component({
  selector: 'app-sectorial-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './sectorial-form.component.html',
  styleUrls: ['./sectorial-form.component.css']
})
export class SectorialFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private sectorialService: SectorialService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<SectorialFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idSectorial:            [0],
      desSectorial:           ['', [Validators.required, Validators.maxLength(248)]],
      estructuraOcupacional:  ['', [Validators.maxLength(248)]],
      codigoIess:             ['', [Validators.maxLength(50)]],
      salarioMinimo:          [null],
      tarifaMinima:           [null],
      estado:                 [true],
      idEmpresa:              [null, [Validators.required]],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.sectorialService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<SectorialResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el sectorial.',
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

    const payload: CreateSectorialRequest = {
      desSectorial:          (raw.desSectorial ?? '').trim(),
      estructuraOcupacional: raw.estructuraOcupacional?.trim() || null,
      codigoIess:            raw.codigoIess?.trim() || null,
      salarioMinimo:         raw.salarioMinimo != null ? Number(raw.salarioMinimo) : null,
      tarifaMinima:          raw.tarifaMinima  != null ? Number(raw.tarifaMinima)  : null,
      estado:                raw.estado,
      idEmpresa:             raw.idEmpresa,
    };

    const req$ = this.isEditMode
      ? this.sectorialService.update(raw.idSectorial, payload)
      : this.sectorialService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Sectorial ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el sectorial.`;
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