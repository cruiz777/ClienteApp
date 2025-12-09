// src/app/components/sic-3000/clasificacion-form/clasificacion-form.component.ts
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
  ClasificacionResponse,
  ClasificacionService,
  ClasificacionCreateRequest,
  ClasificacionUpdateRequest
} from 'src/app/services/clasificacion.service';

export type ModoClasificacion = 'crear' | 'editar';

export interface ClasificacionFormData {
  modo: ModoClasificacion;
  clasificacion: ClasificacionResponse | null;
}

@Component({
  selector: 'app-clasificacion-form',
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
  templateUrl: './clasificacion-form.component.html',
  styleUrls: ['./clasificacion-form.component.css']
})
export class ClasificacionFormComponent implements OnInit {

  form!: FormGroup;
  titulo = 'Nueva Clasificación';
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ClasificacionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClasificacionFormData,
    private clasificacionService: ClasificacionService
  ) {}

  ngOnInit(): void {
    const c = this.data.clasificacion;

    this.titulo = this.data.modo === 'editar'
      ? 'Editar Clasificación'
      : 'Nueva Clasificación';

    this.form = this.fb.group({
      idClasificacion: [c?.idClasificacion ?? null],
      descripcion: [c?.descripcion ?? '', [Validators.required, Validators.maxLength(80)]],
      codigoCuenta: [c?.codigoCuenta ?? '', [Validators.maxLength(20)]],
      estado: [c?.estado ?? true]
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.guardando = true;

    if (this.data.modo === 'editar' && this.data.clasificacion) {
      // PUT
      const id = this.data.clasificacion.idClasificacion;

      const payload: ClasificacionUpdateRequest = {
        idClasificacion: id,
        descripcion: v.descripcion,
        codigoCuenta: v.codigoCuenta || '',
        estado: !!v.estado
      };

      this.clasificacionService.updateClasificacion(id, payload).subscribe({
        next: resp => {
          this.guardando = false;
          if (resp.type === 'Success') {
            this.dialogRef.close(true);
          } else {
            alert(resp.message || 'Error al actualizar la clasificación');
          }
        },
        error: err => {
          this.guardando = false;
          console.error('[ClasificacionForm] Error al actualizar:', err);
          alert('Error al actualizar la clasificación');
        }
      });

    } else {
      // POST
      const payload: ClasificacionCreateRequest = {
        descripcion: v.descripcion,
        codigoCuenta: v.codigoCuenta || '',
        estado: !!v.estado
      };

      this.clasificacionService.createClasificacion(payload).subscribe({
        next: resp => {
          this.guardando = false;
          if (resp.type === 'Success') {
            this.dialogRef.close(true);
          } else {
            alert(resp.message || 'Error al crear la clasificación');
          }
        },
        error: err => {
          this.guardando = false;
          console.error('[ClasificacionForm] Error al crear:', err);
          alert('Error al crear la clasificación');
        }
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
