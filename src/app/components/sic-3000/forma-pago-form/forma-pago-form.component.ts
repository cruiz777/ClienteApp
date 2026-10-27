// src/app/components/sic-3000/forma-pago-form/forma-pago-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import {
  FormaPagoResponse,
  FormaPagoService,
  FormaPagoCreateRequest,
  FormaPagoUpdateRequest
} from 'src/app/services/forma-pago.service';
import { UsuarioService } from 'src/app/services/usuario.service';

export type ModoFormaPago = 'crear' | 'editar';

export interface FormaPagoFormData {
  modo: ModoFormaPago;
  forma?: FormaPagoResponse | null;
}

@Component({
  selector: 'app-forma-pago-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './forma-pago-form.component.html',
  styleUrls: ['./forma-pago-form.component.css']
})
export class FormaPagoFormComponent implements OnInit {

  form!: FormGroup;
  titulo = 'Nueva Forma de Pago';
  guardando = false;

  private idEmpresaActual = 0;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<FormaPagoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FormaPagoFormData,
    private formaPagoService: FormaPagoService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.idEmpresaActual = this.usuarioService.getUsuarioActual()?.id_empresa ?? 0;

    this.titulo = this.data.modo === 'editar'
      ? 'Editar Forma de Pago'
      : 'Nueva Forma de Pago';

    const f = this.data.forma;

    this.form = this.fb.group({
      idFormaPago: [f?.idFormaPago ?? null],

      idClasificacion: [f?.idClasificacion ?? 0, [Validators.required]],
      idFormaPagoSri: [f?.idFormaPagoSri ?? 0, [Validators.required]],

      descripcionPago: [f?.descripcionPago ?? '', [Validators.required, Validators.maxLength(80)]],
      codigoCuenta: [f?.codigo_cuenta ?? '', [Validators.maxLength(20)]],
      idPlan: [f?.id_plan ?? null],

      codigocg: [f?.codigocg ?? '', [Validators.maxLength(20)]],
      codigosic: [f?.codigosic ?? '', [Validators.maxLength(20)]],

      activarFactura: [f?.activarFactura ?? false],
      activarCuentas: [f?.activarCuentas ?? true],
      cxc: [f?.cxc ?? false],
      activarFacturaHis: [f?.activarFacturaHis ?? false],
      activarLiqTarjeta: [f?.activarLiqTarjeta ?? false],
      activarPagTarjeta: [f?.activarPagTarjeta ?? false],
      activarAnticipo: [f?.activarAnticipo ?? false]
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.guardando = true;

    if (this.data.modo === 'editar' && this.data.forma) {
      // 🔹 PUT
      const id = this.data.forma.idFormaPago;

      const payload: FormaPagoUpdateRequest = {
        idFormaPago: id,
        idClasificacion: v.idClasificacion ?? 0,
        idFormaPagoSri: v.idFormaPagoSri ?? 0,
        descripcionPago: v.descripcionPago,
        codigoCuenta: v.codigoCuenta || null,

        activarFactura: v.activarFactura,
        activarCuentas: v.activarCuentas,
        cxc: v.cxc,
        activarFacturaHis: v.activarFacturaHis,
        activarLiqTarjeta: v.activarLiqTarjeta,
        activarPagTarjeta: v.activarPagTarjeta,
        activarAnticipo: v.activarAnticipo,

        codigocg: v.codigocg || null,
        codigosic: v.codigosic || null,

        idEmpresa: this.data.forma.idEmpresa ?? this.idEmpresaActual,
        idPlan: v.idPlan ?? null
      };

      this.formaPagoService.updateFormaPago(id, payload).subscribe({
        next: resp => {
          this.guardando = false;
          if (resp.type === 'Success') {
            this.dialogRef.close(true);
          } else {
            alert(resp.message || 'Error al actualizar la forma de pago');
          }
        },
        error: err => {
          this.guardando = false;
          console.error('[FormaPagoForm] Error al actualizar:', err);
          alert('Error al actualizar la forma de pago');
        }
      });

    } else {
      // 🔹 POST
      const payload: FormaPagoCreateRequest = {
        idClasificacion: v.idClasificacion ?? 0,
        idFormaPagoSri: v.idFormaPagoSri ?? 0,
        descripcionPago: v.descripcionPago,
        codigoCuenta: v.codigoCuenta || null,

        activarFactura: v.activarFactura,
        activarCuentas: v.activarCuentas,
        cxc: v.cxc,
        activarFacturaHis: v.activarFacturaHis,
        activarLiqTarjeta: v.activarLiqTarjeta,
        activarPagTarjeta: v.activarPagTarjeta,
        activarAnticipo: v.activarAnticipo,

        codigocg: v.codigocg || null,
        codigosic: v.codigosic || null,

        idEmpresa: this.idEmpresaActual,
        idPlan: v.idPlan ?? null
      };

      this.formaPagoService.createFormaPago(payload).subscribe({
        next: resp => {
          this.guardando = false;
          if (resp.type === 'Success') {
            this.dialogRef.close(true);
          } else {
            alert(resp.message || 'Error al crear la forma de pago');
          }
        },
        error: err => {
          this.guardando = false;
          console.error('[FormaPagoForm] Error al crear:', err);
          alert('Error al crear la forma de pago');
        }
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
