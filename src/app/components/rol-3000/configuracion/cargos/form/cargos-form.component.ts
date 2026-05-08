import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { RpCargosService } from 'src/app/services/cargos.service';
import { RpCargosResponse } from 'src/app/interfaces/responses/cargos-rol-response';
import { CreateRpCargosRequest } from 'src/app/interfaces/requests/cargos-rol';

@Component({
  selector: 'app-rp-cargos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cargos-form.component.html',
  styleUrls: ['./cargos-form.component.css']
})
export class RpCargosFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private rpCargosService: RpCargosService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<RpCargosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idCargo:     [0],
      descargo:    ['', [Validators.required, Validators.maxLength(248)]],
      codsec:      ['', [Validators.maxLength(10)]],
      responsable: [false],
      horEnf:      [false],
      frmensual:   [false],
      estado:      [true],
      idSectorial: [null],
      idEmpresa:   [null, [Validators.required]],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.rpCargosService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<RpCargosResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el cargo.',
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

    const payload: CreateRpCargosRequest = {
      descargo:    (raw.descargo ?? '').trim(),
      codsec:      raw.codsec?.trim() || null,
      responsable: raw.responsable,
      horEnf:      raw.horEnf,
      frmensual:   raw.frmensual,
      estado:      raw.estado,
      idSectorial: raw.idSectorial || null,
      idEmpresa:   raw.idEmpresa,
    };

    const req$ = this.isEditMode
      ? this.rpCargosService.update(raw.idCargo, payload)
      : this.rpCargosService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Cargo ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el cargo.`;
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