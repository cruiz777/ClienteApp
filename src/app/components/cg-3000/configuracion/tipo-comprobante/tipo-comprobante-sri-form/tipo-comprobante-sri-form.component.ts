import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AsyncValidatorFn, AbstractControl, ValidationErrors, FormControl
} from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, first, switchMap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { TipoComprobanteSriService } from 'src/app/services/tipocomprobantesri.service';
import { TipoComprobanteSriRequest } from 'src/app/interfaces/requests/tipo-comprobantesri-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';

// Validador único por codtipcomp
function codtipcompUnicoValidator(
  service: TipoComprobanteSriService,
  getIdActual: () => number | undefined
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) return of(null);
    const excludeId = getIdActual();

    return of(raw).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(val => service.existsCodtipcomp(val, excludeId)),
      map(exists => exists ? { codtipcompDuplicado: true } : null),
      first()
    );
  };
}

@Component({
  selector: 'app-tipo-comprobantesri-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipo-comprobante-sri-form.component.html',
  styleUrls: ['./tipo-comprobante-sri-form.component.css']
})
export class TipoComprobanteSriFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private tipoComprobanteSriService: TipoComprobanteSriService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TipoComprobanteSriFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Control con updateOn: 'blur' para que el async validator no quede en pending mientras escribes
      Codtipcomp: new FormControl(
        { value: '', disabled: false },
        {
          validators: [Validators.required, Validators.maxLength(3)],
          asyncValidators: [codtipcompUnicoValidator(this.tipoComprobanteSriService, () => this.form?.get('IdTipoCompSri')?.value)],
          updateOn: 'blur'
        }
      ),
      Destipcomp: ['', [Validators.required, Validators.maxLength(248)]],
      Sustentotrib: ['', [Validators.required, Validators.maxLength(248)]],
      IdTipoCompSri: [0],
    });

    this.isEditMode = !!this.data?.id;

    if (this.isEditMode && this.data.id) {
      this.tipoComprobanteSriService.getById(this.data.id).subscribe({
        next: (res) => {
          const payload: any = { ...res.data };
          payload.Codtipcomp = (payload.Codtipcomp ?? payload.codtipcomp ?? '').toString().trim().toUpperCase();
          this.form.patchValue(payload);

          // Bloquea el código en edición (si deseas permitir edición, elimina la línea siguiente)
          this.form.get('Codtipcomp')?.disable({ emitEvent: false });
        },
        error: () => this.mostrarMensaje({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el tipo de comprobante.',
          showCancel: false
        })
      });
    }

    // Normaliza a MAYÚSCULAS en cuanto cambia (si el control está habilitado)
    this.form.get('Codtipcomp')?.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(v => {
      const ctrl = this.form.get('Codtipcomp');
      if (!ctrl || ctrl.disabled) return;
      const norm = (v ?? '').toString().toUpperCase();
      if (norm !== v) ctrl.setValue(norm, { emitEvent: false });
    });
  }

  guardar(): void {
    // Si el async validator sigue corriendo, no enviar
    if (this.form.pending) {
      this.mostrarMensaje({
        type: 'warning',
        title: 'Validando…',
        message: 'Espera a que termine la validación del código.',
        showCancel: false
      });
      return;
    }

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

    const idActual = this.form.get('IdTipoCompSri')?.value as number | undefined;

    // Si el control está deshabilitado (edición), tomar su valor con getRawValue
    const raw = this.form.getRawValue() as any;
    raw.Codtipcomp = (raw.Codtipcomp ?? '').toString().trim().toUpperCase();

    this.tipoComprobanteSriService.existsCodtipcomp(raw.Codtipcomp, idActual).pipe(first()).subscribe(exists => {
      if (exists) {
        this.form.get('Codtipcomp')?.setErrors({ codtipcompDuplicado: true });
        this.mostrarMensaje({
          type: 'warning',
          title: 'Duplicado',
          message: `El código "${raw.Codtipcomp}" ya existe. Elige otro código.`,
          showCancel: false
        });
        return;
      }

      // Enviar
      const data: TipoComprobanteSriRequest = raw as TipoComprobanteSriRequest;

      const req$ = this.isEditMode
        ? this.tipoComprobanteSriService.update(data.IdTipoCompSri!, data)
        : this.tipoComprobanteSriService.create(data);

      req$.subscribe({
        next: () => this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Tipo de Comprobante ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true)),
        error: (err) => {
          const msg = (err?.error?.message ?? '').toString()
            || `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de Comprobante.`;
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
