import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CajaService, CreateAutorizacionCajaPayload } from 'src/app/services/caja.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-nueva-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './nueva-caja.component.html',
  styleUrls: ['./nueva-caja.component.css']
})
export class NuevaCajaComponent implements OnInit {

  private fb         = inject(FormBuilder);
  private svc        = inject(CajaService);
  private dialogRef  = inject(MatDialogRef<NuevaCajaComponent, boolean>);
  private usuarioSvc = inject(UsuarioService);

  usuarioActual: any = null;

  saving = false;
  errorMsg: string | null = null;

  // Helpers de patrón
  private DIG3  = /^\d{3}$/;
  private DIG13 = /^\d{13}$/;
  private ONLY_DIGITS = /^\d+$/;
  private ONE_UPPER = /^[A-Z]$/;

  form: FormGroup = this.fb.group({
    // exacto 3 dígitos
    num_establecimiento: ['', [Validators.required, Validators.pattern(this.DIG3)]],
    caja:                ['', [Validators.required, Validators.pattern(this.DIG3)]],

    // básicos
    numero_autorizacion: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\-]{1,20}$/i)]],

    id_local:   [null],
    id_empresa: [null],

    // a MAYÚSCULAS
    nombre_comercial: ['', [Validators.required, Validators.maxLength(80)]],
    direccion:        ['', [Validators.required, Validators.maxLength(150)]],

    // RUC 13 dígitos
    ruc: [ '', [Validators.required, Validators.pattern(this.DIG13)] ],

    generar_xml: [true],

    // numéricos (0..20 dígitos opcional)
    numero_factura:  [null, [Validators.pattern(/^\d{1,9}$/)]],
    numero_ncredito: [null, [Validators.pattern(/^\d{1,9}$/)]],

    // 1 letra MAYÚSCULA (auto-upper)
    estado_factura:  [null, [Validators.pattern(this.ONE_UPPER)]],
    estado_ncredito: [null, [Validators.pattern(this.ONE_UPPER)]],

    // opcionales
    fecini: [null], fecfin: [null], docini: [null], docfin: [null],
    doc_sri: [null], id_tipo_documento: [null],
  });

  ngOnInit(): void {
    this.usuarioActual = this.usuarioSvc.getUsuarioActual?.() ?? null;

    if (this.usuarioActual) {
      this.form.patchValue({
        id_empresa:          this.usuarioActual.id_empresa ?? null,
        id_local:            this.usuarioActual.id_local ?? 1,
        num_establecimiento: this.usuarioActual.num_establecimiento ?? ''
      });
    }

    // ===== AUTOCORRECCIONES =====
    // Solo dígitos y límite 3 en num_establecimiento / caja
    this.bindDigitsLimiter('num_establecimiento', 3);
    this.bindDigitsLimiter('caja', 3);

    // RUC solo dígitos y límite 13
    this.bindDigitsLimiter('ruc', 13);

    // Uppercase para textos
    this.bindUppercase('nombre_comercial');
    this.bindUppercase('direccion');

    // Uppercase para estados (1 letra) y limpiar extra
    this.bindUppercase('estado_factura', true);
    this.bindUppercase('estado_ncredito', true);
  }

  // ===== Helpers de binding =====
  private bindDigitsLimiter(ctrlName: string, max: number) {
    const c = this.form.get(ctrlName);
    if (!c) return;

    c.valueChanges.subscribe(v => {
      if (v == null) return;
      let s = String(v).replace(/\D+/g, ''); // elimina no-dígitos
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

  // Rellenar con ceros a la izquierda para campos 3 dígitos
  pad3(ctrlName: string) {
    const c = this.form.get(ctrlName);
    if (!c) return;
    const v = (c.value ?? '').toString();
    if (!v) return;
    const padded = v.padStart(3, '0').slice(0, 3);
    if (padded !== v) c.setValue(padded);
    c.updateValueAndValidity();
  }

  crear(): void {
    if (this.form.invalid) {
    const firstInvalid = Object.keys(this.form.controls)
      .find(k => this.form.get(k)?.invalid);

    console.warn('Primer control inválido:', firstInvalid, this.form.get(firstInvalid!)?.errors);

    this.form.markAllAsTouched();
    return; // 🔙 no continúa si el formulario es inválido
  }

    const v = this.form.value;
    const num_establecimiento = v.num_establecimiento?.trim();
    const caja                = v.caja?.trim();
    const id_local            = Number(v.id_local ?? this.usuarioActual?.id_local);
    const id_empresa          = Number(this.usuarioActual?.id_empresa ?? v.id_empresa);

    this.saving = true;
    this.errorMsg = null;

    // Pre-chequeo duplicado
    this.svc.existsCaja(num_establecimiento!, caja!, id_empresa, id_local).pipe(
      switchMap(exists => {
        if (exists) {
          this.form.get('caja')?.setErrors({ duplicated: true });
          this.form.get('num_establecimiento')?.setErrors({ duplicated: true });
          this.errorMsg = 'Ya existe una Caja con ese Establecimiento y Caja.';
          this.saving = false;
          return EMPTY;
        }

        const payload: CreateAutorizacionCajaPayload = {
          caja,
          numero_autorizacion: v.numero_autorizacion?.trim(),
          docini:              v.docini ?? null,
          docfin:              v.docfin ?? null,
          fecini:              v.fecini ?? null,
          fecfin:              v.fecfin ?? null,
          doc_sri:             v.doc_sri ?? null,
          numero_factura:      v.numero_factura != null ? String(v.numero_factura).trim() : null,
          estado_factura:      v.estado_factura?.trim() ?? null,
          num_establecimiento,
          id_local,
          direccion:           v.direccion?.trim() ?? null,
          ruc:                 v.ruc?.trim() ?? null,
          nombre_comercial:    v.nombre_comercial?.trim() ?? null,
          id_empresa,
          generar_xml:         !!v.generar_xml,
          id_tipo_documento:   v.id_tipo_documento ?? null,
          numero_ncredito:     v.numero_ncredito != null ? String(v.numero_ncredito).trim() : null,
          estado_ncredito:     v.estado_ncredito?.trim() ?? null
        };

        return this.svc.create(payload);
      })
    ).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        console.error(err);
        if (err?.status === 409) {
          this.form.get('caja')?.setErrors({ duplicated: true });
          this.form.get('num_establecimiento')?.setErrors({ duplicated: true });
          this.errorMsg = err?.error?.message || 'Caja duplicada.';
        } else {
          this.errorMsg = err?.error?.message || 'No se pudo crear la autorización.';
        }
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  // Atajos para template
  get f() { return this.form.controls; }
  hasErr(name: string, err: string) { return this.form.get(name)?.hasError(err); }
  touched(name: string) { return this.form.get(name)?.touched; }
}
