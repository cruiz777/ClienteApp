import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, first, switchMap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoRequest } from 'src/app/interfaces/requests/tipo-asiento-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

function tipAsientoUnicoValidator(
  service: TipoAsientoService,
  getIdActual: () => number | undefined
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) return of(null);
    const excludeId = getIdActual();
    return of(raw).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => service.existsTipAsiento(val, excludeId)),
      map(exists => exists ? { tipAsientoDuplicado: true } : null),
      first()
    );
  };
}

@Component({
  selector: 'app-tipo-asiento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipo-asiento-form.component.html',
  styleUrls: ['./tipo-asiento-form.component.css']
})
export class TipoAsientoFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private tipoAsientoService: TipoAsientoService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoAsientoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      IdTipoAsiento: [0],
      TipAsiento: [
        '',
        [Validators.required, Validators.maxLength(2)],
        [tipAsientoUnicoValidator(this.tipoAsientoService, () => this.form?.get('IdTipoAsiento')?.value)]
      ],
      Descripcion: ['', [Validators.required, Validators.maxLength(20)]],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoAsientoService.getById(this.data.id).subscribe({
        next: (res) => {
          this.form.patchValue(res.data);
          // normaliza TipAsiento a MAYÚSCULAS
          const t = (this.form.get('TipAsiento')?.value ?? '').toString().trim().toUpperCase();
          this.form.get('TipAsiento')?.setValue(t, { emitEvent: false });
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el Tipo de Asiento.',
          showCancel: false
        })
      });
    }

    // Normaliza TipAsiento en tiempo real (MAYÚSCULAS y trim suave)
    this.form.get('TipAsiento')?.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(v => {
      const norm = (v ?? '').toString().toUpperCase();
      if (norm !== v) this.form.get('TipAsiento')?.setValue(norm, { emitEvent: false });
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario inválido',
        message: 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      return;
    }

    // chequeo final de duplicado antes de enviar
    const idActual = this.form.get('IdTipoAsiento')?.value as number | undefined;
    const tip = (this.form.get('TipAsiento')?.value ?? '').toString().trim().toUpperCase();

    this.tipoAsientoService.existsTipAsiento(tip, idActual).pipe(first()).subscribe(exists => {
      if (exists) {
        this.form.get('TipAsiento')?.setErrors({ tipAsientoDuplicado: true });
        this.mostrarMensaje({
          type: 'warning',
          title: 'Duplicado',
          message: `El Tipo de Asiento "${tip}" ya existe. Elige otro código.`,
          showCancel: false
        });
        return;
      }

      const data: TipoAsientoRequest = this.form.value as TipoAsientoRequest;

      const req$ = this.isEditMode
        ? this.tipoAsientoService.update(data.IdTipoAsiento!, data)
        : this.tipoAsientoService.create(data);

      req$.subscribe({
        next: () => this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de Asiento ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
        error: (err) => {
          // si backend también valida únicos, podría devolver 409/validación
          const msg = (err?.error?.message ?? '').toString() || `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el Tipo de Asiento.`;
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: msg,
            showCancel: false
          });
        }
      });
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
