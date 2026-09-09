import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';

import { IngresoDescuentosService } from 'src/app/services/ingreso-descuentos.service';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { IngresoDescuentosResponse } from 'src/app/interfaces/responses/ingreso-descuentos-request';
import { CreateIngresoDescuentosRequest } from 'src/app/interfaces/requests/ingreso-descuentos-request';

@Component({
  selector: 'app-ingreso-descuentos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './ingreso-descuentos-form.component.html',
  styleUrls: ['./ingreso-descuentos-form.component.css']
})
export class IngresoDescuentosFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private ingresoDescuentosService: IngresoDescuentosService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<IngresoDescuentosFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      idIngDesc:           [0],
      codigo:              ['', [Validators.maxLength(20)]],
      tipoPago:            ['', [Validators.maxLength(50)]],
      descripcion:         ['', [Validators.required, Validators.maxLength(248)]],
      ctaContable:         ['', [Validators.maxLength(50)]],
      ctaContable2:        ['', [Validators.maxLength(50)]],
      ctaContable3:        ['', [Validators.maxLength(50)]],
      ctaContable4:        ['', [Validators.maxLength(50)]],
      ctaContable5:        ['', [Validators.maxLength(50)]],
      estado:              [true],
      porcenCant:          ['', [Validators.maxLength(50)]],
      observacion:         ['', [Validators.maxLength(500)]],
      incluir:             [false],
      calculado:           [false],
      aportaciones:        [false],
      orden:               [null],
      dH:                  ['', [Validators.maxLength(1)]],
      desac:               [false],
      parSue:              [false],
      estVacaciones:       [false],
      estFondosReserva:    [false],
      estDecimoTercer:     [false],
      estImpuestoRenta:    [false],
      estOtrosIng:         [false],
      aplicaAportesPatPer: [false],
      estRubrosLiquida:    [false],
      estOtrosIngImp:      [false],
      estIngImp:           [false],
      estIngImpFr:         [false],
      sumaDias:            [false],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.ingresoDescuentosService.getById(this.data.id).subscribe({
        next: (resp: ApiResponse<IngresoDescuentosResponse>) => {
          this.form.patchValue(resp.data);
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el ingreso/descuento.',
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

    const payload: CreateIngresoDescuentosRequest = {
      codigo:              raw.codigo?.trim() || null,
      tipoPago:            raw.tipoPago?.trim() || null,
      descripcion:         (raw.descripcion ?? '').trim() || null,
      ctaContable:         raw.ctaContable?.trim() || null,
      ctaContable2:        raw.ctaContable2?.trim() || null,
      ctaContable3:        raw.ctaContable3?.trim() || null,
      ctaContable4:        raw.ctaContable4?.trim() || null,
      ctaContable5:        raw.ctaContable5?.trim() || null,
      estado:              raw.estado,
      porcenCant:          raw.porcenCant?.trim() || null,
      observacion:         raw.observacion?.trim() || null,
      incluir:             raw.incluir,
      calculado:           raw.calculado,
      aportaciones:        raw.aportaciones,
      orden:               raw.orden || null,
      dH:                  raw.dH?.trim() || null,
      desac:               raw.desac,
      parSue:              raw.parSue,
      estVacaciones:       raw.estVacaciones,
      estFondosReserva:    raw.estFondosReserva,
      estDecimoTercer:     raw.estDecimoTercer,
      estImpuestoRenta:    raw.estImpuestoRenta,
      estOtrosIng:         raw.estOtrosIng,
      aplicaAportesPatPer: raw.aplicaAportesPatPer,
      estRubrosLiquida:    raw.estRubrosLiquida,
      estOtrosIngImp:      raw.estOtrosIngImp,
      estIngImp:           raw.estIngImp,
      estIngImpFr:         raw.estIngImpFr,
      sumaDias:            raw.sumaDias,
    };

    const req$ = this.isEditMode
      ? this.ingresoDescuentosService.update(raw.idIngDesc, payload)
      : this.ingresoDescuentosService.create(payload);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Ingreso/Descuento ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false,
          confirmText: 'Aceptar'
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const msg = err?.error?.message ?? err?.message
          ?? `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el ingreso/descuento.`;
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