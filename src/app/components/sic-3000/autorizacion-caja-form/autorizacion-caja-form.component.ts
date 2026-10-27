// src/app/components/sic-3000/autorizacion-caja-form/autorizacion-caja-form.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, map, catchError, throwError } from 'rxjs';

import {
  AutorizacionCajaService,
  ApiResponse,
  AutorizacionCaja,
} from 'src/app/services/autorizacion-caja.service';

export type AutorizacionCajaFormModo = 'crear' | 'editar';

export interface AutorizacionCajaFormData {
  modo: AutorizacionCajaFormModo;
  item?: AutorizacionCaja | null; // <-- aquí viene el registro cuando editas
}

export interface AutorizacionCajaUpsertRequest {
  // id_autorizacion_caja NO se envía en crear; en editar va por ruta (id)
  caja: string;
  numero_autorizacion: string;

  docini?: number | null;
  docfin?: number | null;

  fecini?: string | null;
  fecfin?: string | null;

  numero?: string | null;
  estado?: string | null;

  num_establecimiento?: string | null;
  id_local?: number | null;

  direccion?: string | null;
  ruc?: string | null;
  nombre_comercial?: string | null;

  id_empresa?: number | null;
  generar_xml?: boolean | null;

  id_tipo_documento?: number | null;
  sucursal?: string | null;
  produccion?: number | null;
}

@Component({
  selector: 'app-autorizacion-caja-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './autorizacion-caja-form.component.html',
  styleUrls: ['./autorizacion-caja-form.component.css'],
})
export class AutorizacionCajaFormComponent {
  form: FormGroup;
  modo: AutorizacionCajaFormModo;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private autCajaService: AutorizacionCajaService,
    private dialogRef: MatDialogRef<AutorizacionCajaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AutorizacionCajaFormData
  ) {
    this.modo = data?.modo ?? 'crear';

    this.form = this.fb.group({
      id_autorizacion_caja: [null], // solo lectura
      caja: ['', [Validators.required]],
      numero_autorizacion: ['', [Validators.required]],

      docini: [null],
      docfin: [null],
      fecini: [null],
      fecfin: [null],

      numero: [null],
      estado: ['A'],

      num_establecimiento: ['', [Validators.required]],
      id_local: [null],

      direccion: ['', [Validators.required]],
      ruc: ['', [Validators.required]],
      nombre_comercial: ['', [Validators.required]],

      id_empresa: [1],            // ajusta si lo quieres dinámico
      generar_xml: [true],

      id_tipo_documento: [null, [Validators.required]],
      sucursal: [''],
      produccion: [1],
    });

    // ✅ siempre solo lectura (evita errores por el atributo disabled en HTML)
    this.form.get('id_autorizacion_caja')?.disable({ emitEvent: false });

    // ✅ si es edición, precarga
    const it = data?.item ?? null;
    if (this.modo === 'editar' && it) {
      this.form.patchValue({
        id_autorizacion_caja: it.id_autorizacion_caja,
        caja: it.caja ?? '',
        numero_autorizacion: it.numero_autorizacion ?? '',

        docini: it.docini ?? null,
        docfin: it.docfin ?? null,
        fecini: it.fecini ?? null,
        fecfin: it.fecfin ?? null,

        numero: it.numero ?? null,
        estado: it.estado ?? 'A',

        num_establecimiento: it.num_establecimiento ?? '',
        id_local: it.id_local ?? null,

        direccion: it.direccion ?? '',
        ruc: it.ruc ?? '',
        nombre_comercial: it.nombre_comercial ?? '',

        id_empresa: it.id_empresa ?? 1,
        generar_xml: it.generar_xml ?? true,

        id_tipo_documento: it.id_tipo_documento ?? null,
        sucursal: it.sucursal ?? '',
        produccion: it.produccion ?? 1,
      });
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

    const raw = this.form.getRawValue(); // incluye id_autorizacion_caja aunque esté disabled
    const id: number | null = raw.id_autorizacion_caja ?? null;

    const payload: AutorizacionCajaUpsertRequest = {
      caja: (raw.caja ?? '').toString().trim(),
      numero_autorizacion: (raw.numero_autorizacion ?? '').toString().trim(),

      docini: this.toNumberOrNull(raw.docini),
      docfin: this.toNumberOrNull(raw.docfin),
      fecini: raw.fecini ?? null,
      fecfin: raw.fecfin ?? null,

      numero: raw.numero != null ? String(raw.numero) : null,
      estado: raw.estado ?? null,

      num_establecimiento: raw.num_establecimiento ?? null,
      id_local: 1,

      direccion: raw.direccion ?? null,
      ruc: raw.ruc ?? null,
      nombre_comercial: raw.nombre_comercial ?? null,

      id_empresa: this.toNumberOrNull(raw.id_empresa),
      generar_xml: raw.generar_xml ?? null,

      id_tipo_documento: this.toNumberOrNull(raw.id_tipo_documento),
      sucursal: raw.sucursal ?? null,
      produccion: this.toNumberOrNull(raw.produccion),

    };

    let req$: Observable<ApiResponse<any>>;

    if (this.modo === 'crear') {
      req$ = this.createAutorizacionCaja(payload);
    } else {
      if (!id) {
        this.loading = false;
        this.error = 'No se pudo determinar el Id para actualizar.';
        return;
      }
      req$ = this.updateAutorizacionCaja(id, payload);
    }

    req$.subscribe({
      next: (resp) => {
        this.loading = false;

        if (resp?.type?.toLowerCase() === 'success' || resp?.type?.toLowerCase() === 'ok') {
          this.dialogRef.close(true);
          return;
        }

        this.error = resp?.message ?? 'No se pudo guardar.';
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.error = err?.error?.message || err?.message || 'Error al guardar.';
      },
    });
  }

  /**
   * ==========================
   * ✅ HTTP (Create / Update)
   * ==========================
   * Nota: si ya tienes estos métodos en tu service, reemplaza estas funciones
   * por llamadas directas a this.autCajaService.create / update.
   */

  private createAutorizacionCaja(body: AutorizacionCajaUpsertRequest): Observable<ApiResponse<any>> {
    // Si tu backend usa POST /AutorizacionCaja
    return this.autCajaServiceHttpPost<ApiResponse<any>>('/AutorizacionCaja', body);
  }

  private updateAutorizacionCaja(id: number, body: AutorizacionCajaUpsertRequest): Observable<ApiResponse<any>> {
    // Si tu backend usa PUT /AutorizacionCaja/{id}
    return this.autCajaServiceHttpPut<ApiResponse<any>>(`/AutorizacionCaja/${id}`, body);
  }

  /**
   * Wrappers que respetan tu patrón: Accept: text/plain (aunque devuelva json)
   * y parse manual del texto.
   */
  private autCajaServiceHttpPost<T>(path: string, body: any): Observable<T> {
    return (this.autCajaService as any).http
      .post((this.autCajaService as any).apiBaseUrl + path, body, {
        headers: (this.autCajaService as any).plainHeaders?.() ?? undefined,
        responseType: 'text',
      })
      .pipe(
        map((t: string) => JSON.parse(t) as T),
        catchError((e: any) => throwError(() => e))
      );
  }

  private autCajaServiceHttpPut<T>(path: string, body: any): Observable<T> {
    return (this.autCajaService as any).http
      .put((this.autCajaService as any).apiBaseUrl + path, body, {
        headers: (this.autCajaService as any).plainHeaders?.() ?? undefined,
        responseType: 'text',
      })
      .pipe(
        map((t: string) => JSON.parse(t) as T),
        catchError((e: any) => throwError(() => e))
      );
  }

  /**
   * ==========================
   * Utilidades
   * ==========================
   */
  private toNumberOrNull(v: any): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}
