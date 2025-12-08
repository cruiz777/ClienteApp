// src/app/components/sic-3000/descuento-form/descuento-form.component.ts
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
import { MatButtonModule } from '@angular/material/button';

import {
  DescuentoService,
  Descuento,
  DescuentoCreateRequest,
  DescuentoUpdateRequest
} from 'src/app/services/descuento.service';

export type ModoDescuento = 'crear' | 'editar';

export interface DescuentoFormData {
  modo: ModoDescuento;
  descuento: Descuento | null;
}

@Component({
  selector: 'app-descuento-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './descuento-form.component.html',
  styleUrls: ['./descuento-form.component.css']
})
export class DescuentoFormComponent implements OnInit {

  form!: FormGroup;
  titulo = 'Nuevo Descuento';
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DescuentoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DescuentoFormData,
    private descuentoService: DescuentoService
  ) {}

  ngOnInit(): void {
    const d = this.data.descuento;

    this.titulo = this.data.modo === 'editar'
      ? 'Editar Descuento'
      : 'Nuevo Descuento';

    this.form = this.fb.group({
      idDescuento: [d?.idDescuento ?? null],
      descripcion: [d?.descripcion ?? '', [Validators.required, Validators.maxLength(80)]],
      valor: [
        d?.valor ?? 0,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ]
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.guardando = true;

    if (this.data.modo === 'editar' && this.data.descuento) {
      // PUT
      const payload: DescuentoUpdateRequest = {
        idDescuento: this.data.descuento.idDescuento,
        descripcion: v.descripcion,
        valor: Number(v.valor) || 0
      };

      this.descuentoService.update(payload).subscribe({
        next: (resp) => {
          this.guardando = false;
          if (resp) {
            this.dialogRef.close(true);
          } else {
            alert('No se pudo actualizar el descuento');
          }
        },
        error: (err) => {
          this.guardando = false;
          console.error('[DescuentoForm] Error al actualizar:', err);
          alert('Error al actualizar el descuento');
        }
      });

    } else {
      // POST
      const payload: DescuentoCreateRequest = {
        descripcion: v.descripcion,
        valor: Number(v.valor) || 0
      };

      this.descuentoService.create(payload).subscribe({
        next: (resp) => {
          this.guardando = false;
          if (resp) {
            this.dialogRef.close(true);
          } else {
            alert('No se pudo crear el descuento');
          }
        },
        error: (err) => {
          this.guardando = false;
          console.error('[DescuentoForm] Error al crear:', err);
          alert('Error al crear el descuento');
        }
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
