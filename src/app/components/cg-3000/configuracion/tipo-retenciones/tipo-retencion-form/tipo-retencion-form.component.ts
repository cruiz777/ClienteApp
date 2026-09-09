import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { TipoRetencionService } from 'src/app/services/tiporetencion.service';
import { TipoRetencionRequest } from 'src/app/interfaces/requests/tipo-retencion-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-tipo-retencion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './tipo-retencion-form.component.html',
  styleUrls: ['./tipo-retencion-form.component.css']
})
export class TipoRetencionFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  private originalCodigo: string | null = null;

  constructor(
    private fb: FormBuilder,
    private tipoRetencionService: TipoRetencionService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoRetencionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    // 1) Calentar caché una sola vez para que el validador sync funcione
    this.tipoRetencionService.warmCodesCache().subscribe();

    // 2) Crear formulario con validador SINCRONO de duplicado
    this.form = this.fb.group({
      CodigoTipoRet: [
        '',
        [
          Validators.required,
          Validators.maxLength(10),
          this.codigoDuplicadoSync() // <<--- aquí se valida por string contra el caché
        ]
      ],
      Descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      Porcentaje: [0, [Validators.required, Validators.min(0)]],
      IdTipoRetencion: [0],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoRetencionService.getById(this.data.id).subscribe({
        next: (res) => {
          const codigo = (res.data?.CodigoTipoRet ?? '').toString().trim().toUpperCase();
          this.originalCodigo = codigo;
          this.form.patchValue({
            ...res.data,
            CodigoTipoRet: codigo,
            Porcentaje: Math.max(0, Number(res.data?.Porcentaje ?? 0))
          });
          // Revalida duplicado con el código actual (debe quedar OK)
          this.form.get('CodigoTipoRet')?.updateValueAndValidity({ onlySelf: true });
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de retención.',
          showCancel: false
        })
      });
    }
  }

  /** Validador SINCRONO que consulta el snapshot del caché */
  private codigoDuplicadoSync(): ValidatorFn {
    return (control: AbstractControl) => {
      const raw = (control.value ?? '').toString();
      const valor = raw.trim().toUpperCase();
      if (!valor) return null;

      // En edición, si no cambió, no marcar duplicado
      if (this.isEditMode && this.originalCodigo && this.originalCodigo === valor) {
        return null;
      }

      const set = this.tipoRetencionService.getCodesSnapshot(); // snapshot actual
      return set.has(valor) ? { codigoNoUnico: true } : null;
    };
  }

  // Evita negativos mientras escribe
  onPorcentajeInput(): void {
    const c = this.form.get('Porcentaje');
    const num = Number(c?.value ?? 0);
    if (isNaN(num) || num < 0) c?.setValue(0, { emitEvent: false });
  }

  /** Chequeo rápido en submit (por si el caché quedó desfasado) */
  private async existeCodigoFast(codigo: string): Promise<boolean> {
    return await firstValueFrom(
      this.tipoRetencionService.existsByCodigo(codigo).pipe(
        timeout(1500),
        catchError(() => of(false))
      )
    );
  }

  async guardar(): Promise<void> {
    const cCodigo = this.form.get('CodigoTipoRet');
    const cPorc = this.form.get('Porcentaje');

    // Normaliza
    const norm = (cCodigo?.value ?? '').toString().trim().toUpperCase();
    cCodigo?.setValue(norm, { emitEvent: false });
    cPorc?.setValue(Math.max(0, Number(cPorc?.value ?? 0)), { emitEvent: false });

    // Valida todo (incluye el validador sync de duplicado)
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.mostrarMensaje({
        type: 'warning',
        title: 'Validación',
        message: 'Completa los campos obligatorios.',
        showCancel: false
      });
      return;
    }

    // Verificación final por si el caché se invalidó en paralelo
    let codigoExiste = false;
    if (!this.isEditMode || (this.isEditMode && this.originalCodigo !== norm)) {
      codigoExiste = await this.existeCodigoFast(norm);
    }
    if (codigoExiste) {
      cCodigo?.setErrors({ codigoNoUnico: true });
      this.mostrarMensaje({
        type: 'warning',
        title: 'Duplicado',
        message: 'El código de retención ya existe. Cambia el "Código Retención".',
        showCancel: false
      });
      return;
    }

    // Payload final
    const raw = this.form.value as TipoRetencionRequest;
    const data: TipoRetencionRequest = {
      ...raw,
      CodigoTipoRet: norm,
      Porcentaje: Math.max(0, Number(raw.Porcentaje ?? 0))
    };

    const req$ = this.isEditMode
      ? this.tipoRetencionService.update(data.IdTipoRetencion!, data)
      : this.tipoRetencionService.create(data);

    req$.subscribe({
      next: () =>
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de Retención ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
      error: (err) => {
        const status = err?.status;
        const msg: string = (err?.error?.message || err?.message || '').toString().toLowerCase();

        // Respaldo por UNIQUE en BD
        if (status === 409 || msg.includes('duplic') || msg.includes('unique') || msg.includes('existe')) {
          cCodigo?.setErrors({ codigoNoUnico: true });
          this.mostrarMensaje({
            type: 'warning',
            title: 'Duplicado',
            message: 'La cuenta/código de retención ya existe. Verifica el campo "Código Retención".',
            showCancel: false
          });
          return;
        }

        this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de Retención.`,
          showCancel: false
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
