import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CajaService, UpdateAutorizacionCajaPayload } from 'src/app/services/caja.service';
import { finalize } from 'rxjs/operators';

export interface EditarCajaData {
  id_autorizacion_caja: number;
  caja: string;
  numero_autorizacion: string;
  numero_factura: string;
  estado_factura: string;
  num_establecimiento: string;
  direccion: string;
  ruc: string;
  nombre_comercial: string;
  generar_xml: boolean;
  numero_ncredito: string;
  estado_ncredito: string;
}

@Component({
  selector: 'app-editar-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './editar-caja.component.html',
  styleUrls: ['./editar-caja.component.css']
})
export class EditarCajaComponent {
  private dialogRef = inject(MatDialogRef<EditarCajaComponent, boolean>);
  private fb = inject(FormBuilder);
  private svc = inject(CajaService);
  data = inject<EditarCajaData>(MAT_DIALOG_DATA);

  saving = false;
  errorMsg: string | null = null;

  // Patrones iguales al formulario "Nueva Caja"
  private DIG3 = /^\d{3}$/;
  private DIG13 = /^\d{13}$/;
  private ONE_UPPER = /^[A-Z]$/;

  form: FormGroup = this.fb.group({
    // Readonly, pero dejamos los patrones para consistencia
    id_autorizacion_caja: [{ value: this.data.id_autorizacion_caja, disabled: true }],
    num_establecimiento:  [{ value: this.data.num_establecimiento, disabled: true }, [Validators.pattern(this.DIG3)]],
    caja:                 [{ value: this.data.caja,               disabled: true }, [Validators.pattern(this.DIG3)]],

    // A MAYÚSCULAS
    direccion:        [this.data.direccion, [Validators.required, Validators.maxLength(150)]],
    nombre_comercial: [this.data.nombre_comercial, [Validators.required, Validators.maxLength(80)]],

    // RUC 13 dígitos
    ruc: [this.data.ruc, [Validators.required, Validators.pattern(this.DIG13)]],

    // # Autorización requerido (hasta 20)
    numero_autorizacion: [this.data.numero_autorizacion, [Validators.required, Validators.maxLength(20)]],

    generar_xml: [this.data.generar_xml],

    // Solo números (hasta 20). Son OPCIONALES.
    numero_factura:  [this.data.numero_factura ?? null,  [Validators.pattern(/^\d{1,20}$/)]],
    numero_ncredito: [this.data.numero_ncredito ?? null, [Validators.pattern(/^\d{1,20}$/)]],

    // 1 letra MAYÚSCULA (opcional)
    estado_factura:  [this.data.estado_factura ?? null,  [Validators.pattern(this.ONE_UPPER)]],
    estado_ncredito: [this.data.estado_ncredito ?? null, [Validators.pattern(this.ONE_UPPER)]],
  });

  constructor() {
    // ===== Comportamientos en vivo (idénticos a "Nueva Caja")
    this.bindUppercase('nombre_comercial');
    this.bindUppercase('direccion');
    this.bindUppercase('estado_factura', true);
    this.bindUppercase('estado_ncredito', true);

    // RUC solo dígitos y límite 13
    this.bindDigitsLimiter('ruc', 13);

    // # Factura / # N. Crédito: solo dígitos y máx 20
    this.bindDigitsLimiter('numero_factura', 20);
    this.bindDigitsLimiter('numero_ncredito', 20);
  }

  // ===== Helpers iguales a los del crear =====
  private bindDigitsLimiter(ctrlName: string, max: number) {
    const c = this.form.get(ctrlName);
    if (!c) return;
    c.valueChanges.subscribe(v => {
      if (v == null) return;
      let s = String(v).replace(/\D+/g, '');
      if (s.length > max) s = s.slice(0, max);
      if (s !== v) c.setValue(s, { emitEvent: false });
    });
  }

  private bindUppercase(ctrlName: string, singleChar = false) {
    const c = this.form.get(ctrlName);
    if (!c) return;
    c.valueChanges.subscribe(v => {
      if (v == null) return;
      let s = String(v).toUpperCase();
      if (singleChar) s = s.slice(0, 1).replace(/[^A-Z]/g, '');
      if (s !== v) c.setValue(s, { emitEvent: false });
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      // Diagnóstico rápido (opcional)
      // const firstInvalid = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
      // console.warn('Primer inválido:', firstInvalid, this.form.get(firstInvalid!)?.errors);

      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as any; // incluye readonly
    const id = raw.id_autorizacion_caja as number;

    const payload: UpdateAutorizacionCajaPayload = {
      numero_autorizacion:  raw.numero_autorizacion?.trim(),
      numero_factura:       raw.numero_factura?.trim() ?? null,
      estado_factura:       raw.estado_factura?.trim() ?? null,
      num_establecimiento:  raw.num_establecimiento?.trim(),
      direccion:            raw.direccion?.trim(),
      ruc:                  raw.ruc?.trim(),
      nombre_comercial:     raw.nombre_comercial?.trim(),
      generar_xml:          !!raw.generar_xml,
      numero_ncredito:      raw.numero_ncredito?.trim() ?? null,
      estado_ncredito:      raw.estado_ncredito?.trim() ?? null,
    };

    this.errorMsg = null;
    this.saving = true;

    this.svc.update(id, payload)
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          console.error(err);
          this.errorMsg = (err?.error?.message as string) || 'No se pudo actualizar la autorización.';
        }
      });
  }

  cancelar(): void { this.dialogRef.close(false); }

  // Atajos para template
  get f() { return this.form.controls; }
  hasErr(name: string, err: string) { return this.form.get(name)?.hasError(err); }
  touched(name: string) { return this.form.get(name)?.touched; }
}
