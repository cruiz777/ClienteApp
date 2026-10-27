import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import {
  TipoDocumentoSriService,
  ApiResponse,
  TipoDocumentoSriResponse,
  CreateTipoDocumentoSriRequest,
  UpdateTipoDocumentoSriRequest
} from 'src/app/services/tipo-documento-sri.service';

export type TipoDocFormModo = 'crear' | 'editar';

export interface TipoDocFormData {
  modo: TipoDocFormModo;
  item?: TipoDocumentoSriResponse | null;
}

@Component({
  selector: 'app-tipo-doc-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-doc-form.component.html',
  styleUrls: ['./tipo-doc-form.component.css']
})
export class TipoDocFormComponent {
  form: FormGroup;
  modo: TipoDocFormModo;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private tipoDocService: TipoDocumentoSriService,
    private dialogRef: MatDialogRef<TipoDocFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TipoDocFormData
  ) {
    this.modo = data?.modo ?? 'crear';

    this.form = this.fb.group({
      idTipoDocumento: [null], // solo lectura en editar
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      documentoSri: ['', [Validators.maxLength(50)]],
    });

    // precarga en editar
    const it = data?.item ?? null;
    if (this.modo === 'editar' && it) {
      this.form.patchValue({
        idTipoDocumento: it.idTipoDocumento,
        descripcion: it.descripcion ?? '',
        documentoSri: it.documentoSri ?? '',
      });
      this.form.get('idTipoDocumento')?.disable({ emitEvent: false });
    }
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Complete los campos obligatorios.';
      return;
    }

    this.loading = true;

    const raw = this.form.getRawValue();
    const id = raw.idTipoDocumento as number | null;

    if (this.modo === 'crear') {
      const req: CreateTipoDocumentoSriRequest = {
        descripcion: (raw.descripcion ?? '').toString().trim(),
        documentoSri: (raw.documentoSri ?? '').toString().trim() || null,
      };

      this.tipoDocService.create(req).subscribe({
        next: (resp: ApiResponse<TipoDocumentoSriResponse>) => {
          this.loading = false;

          const t = (resp.type || '').toUpperCase();
          if (t === 'CREATED' || t === 'SUCCESS') {
            this.dialogRef.close(true);
            return;
          }
          this.error = resp.message ?? 'No se pudo guardar.';
        },
        error: (err: any) => {
          this.loading = false;
          console.error(err);
          this.error = err?.error?.message ?? err?.message ?? 'Error al guardar.';
        }
      });

    } else {
      if (!id) {
        this.loading = false;
        this.error = 'No se pudo determinar el Id para actualizar.';
        return;
      }

      const req: UpdateTipoDocumentoSriRequest = {
        idTipoDocumento: id,
        descripcion: (raw.descripcion ?? '').toString().trim(),
        documentoSri: (raw.documentoSri ?? '').toString().trim() || null,
      };

      this.tipoDocService.update(id, req).subscribe({
        next: (resp: ApiResponse<TipoDocumentoSriResponse>) => {
          this.loading = false;

          const t = (resp.type || '').toUpperCase();
          if (t === 'UPDATED' || t === 'SUCCESS') {
            this.dialogRef.close(true);
            return;
          }
          this.error = resp.message ?? 'No se pudo actualizar.';
        },
        error: (err: any) => {
          this.loading = false;
          console.error(err);
          this.error = err?.error?.message ?? err?.message ?? 'Error al actualizar.';
        }
      });
    }
  }
}
