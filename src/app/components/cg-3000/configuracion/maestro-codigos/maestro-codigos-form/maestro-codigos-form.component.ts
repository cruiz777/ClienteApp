import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesRequest } from 'src/app/interfaces/requests/codigos-contables-request';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
import { UsuarioService } from 'src/app/services/usuario.service';

import { CiudadService } from 'src/app/services/ciudad.service';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';

import { TipoContribuyenteService } from 'src/app/services/tipocontribuyente.service';
import { TipoContribuyenteResponse } from 'src/app/interfaces/responses/tipo-contribuyente-response';

import { RegistroCivilService } from 'src/app/services/registro-civil.service';
import { ConsultaRucService } from 'src/app/services/rucapi.service';
import { RucConsulta } from 'src/app/interfaces/responses/RucResponse';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';

type ApiResponse<T> = { success?: boolean; ok?: boolean; message?: string; data: T };
type CiudadOption = { id: number; nombre: string };
type TipoConOption = { id: number; nombre: string };

@Component({
  selector: 'app-codigos-contables-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './maestro-codigos-form.component.html',
  styleUrls: ['./maestro-codigos-form.component.css']
})
export class CodigosContablesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  usuarioActual = this.usuarioService.getUsuarioActual();

  ciudades: CiudadOption[] = [];
  tipocontribuyente: TipoConOption[] = [];

  constructor(
    private fb: FormBuilder,
    private codigosservice: CodigosContablesService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private ciudadService: CiudadService,
    private tipoconService: TipoContribuyenteService,
    private registroCivilService: RegistroCivilService,
    private consultaRucService: ConsultaRucService,
    public dialogRef: MatDialogRef<CodigosContablesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {}

  /** Devuelve el primer valor definido/no nulo entre varios alias. */
  private pick<T = any>(obj: any, ...keys: string[]): T | null {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null) return v as T;
    }
    return null;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      idCodContable: [0, [Validators.required]],
      identificacionauxiliar: ['', [Validators.required, Validators.maxLength(150)]],
      nombreauxiliar: ['', [Validators.maxLength(150)]],
      direccionauxiliar: ['', [Validators.required, Validators.maxLength(200)]],
      telefonoauxiliar: ['', [Validators.required, Validators.maxLength(30)]],
      celularauxiliar: ['', [Validators.maxLength(30)]],
      emailauxiliar: ['', [Validators.required, Validators.maxLength(150)]],
      plazo: [0],
      razonsocial: ['', [Validators.required, Validators.maxLength(200)]],
      actividadComercial: ['', [Validators.maxLength(200)]],
      tipopersona: ['01', [Validators.required]],  // 01=Natural, 02=Jurídica
      parterelacionada: [0],
      idPersona: [null],
      idEmpresa: [this.usuarioActual?.id_empresa ?? null],
      idCiudad: [null, [this.requiredSelect]],
      idTipoContribuyente: [null, [this.requiredSelect]],
      idUsuario: [this.usuarioActual?.id_usuario ?? null],
      estado: [true],
      fechaRegistro: [this.todayYmd(), [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      nombre1: ['', [Validators.required, Validators.maxLength(200)]],
      nombre2: ['', [Validators.maxLength(200)]],
      apellido1: ['', [Validators.required, Validators.maxLength(200)]],
      apellido2: ['', [Validators.maxLength(200)]],
      // PARA LA UI: 'CEDULA' | 'PASAPORTE' | 'RUC'
      tipoidentificacion: [{ value: '', disabled: true }] // ['']
    });

    this.cargarCiudadesDesdeResumen();
    this.cargarTipContribuyentes();

    this.isEditMode = !!this.data?.id;
    if (this.isEditMode && this.data.id) {
      this.codigosservice.getById(this.data.id)
        .pipe(
          catchError(() => {
            this.mostrarMensaje({
              type: 'error',
              title: 'Error',
              message: 'No se pudo cargar códigos contables.',
              showCancel: false
            });
            return of(null);
          })
        )
        .subscribe(res => {
          if (!res?.data) return;
          const d: any = res.data;

          // Si el backend guarda 1/2/3, lo traducimos a texto para la UI
          const tipoNum = Number(this.pick(d, 'tipoidentificacion', 'TipoIdentificacion', 'Tipoidentificacion') ?? 0);
          const tipoTxt = tipoNum === 1 ? 'CEDULA' : tipoNum === 2 ? 'PASAPORTE' : tipoNum === 3 ? 'RUC' : '';

          this.form.patchValue({
            idCodContable: this.pick(d, 'idCodContable', 'IdCodContable') ?? 0,
            identificacionauxiliar: this.pick(d, 'identificacionauxiliar', 'Identificacionauxiliar') ?? '',
            nombreauxiliar: this.pick(d, 'nombreauxiliar', 'Nombreauxiliar') ?? '',
            direccionauxiliar: this.pick(d, 'direccionauxiliar', 'Direccionauxiliar') ?? '',
            telefonoauxiliar: this.pick(d, 'telefonoauxiliar', 'Telefonoauxiliar') ?? '',
            celularauxiliar: this.pick(d, 'celularauxiliar', 'Celularauxiliar') ?? '',
            emailauxiliar: this.pick(d, 'emailauxiliar', 'Emailauxiliar') ?? '',
            plazo: this.pick(d, 'plazo', 'Plazo') ?? 0,
            razonsocial: this.pick(d, 'razonsocial', 'razonSocial', 'RazonSocial', 'Razonsocial') ?? '',
            actividadComercial: this.pick(d, 'actividadComercial', 'ActividadComercial') ?? '',
            tipopersona: this.pick(d, 'tipopersona', 'TipoPersona') ?? '01',
            parterelacionada: Number(this.pick(d, 'parterelacionada', 'Parterelacionada') ?? 0),
            idPersona: this.pick(d, 'idPersona', 'IdPersona'),
            idEmpresa: this.pick(d, 'idEmpresa', 'IdEmpresa') ?? this.usuarioActual?.id_empresa ?? null,
            idCiudad: Number(this.pick(d, 'idCiudad', 'IdCiudad') ?? 0) || null,
            idTipoContribuyente: Number(this.pick(d, 'idTipoContribuyente', 'IdTipoContribuyente') ?? 0) || null,
            idUsuario: this.pick(d, 'idUsuario', 'IdUsuario') ?? this.usuarioActual?.id_usuario ?? null,
            estado: this.pick(d, 'estado', 'Estado') ?? true,
            fechaRegistro: String(this.pick(d, 'fechaRegistro', 'FechaRegistro') ?? this.todayYmd()).substring(0, 10),
            nombre1: this.pick(d, 'nombre1', 'Nombre1') ?? '',
            nombre2: this.pick(d, 'nombre2', 'Nombre2') ?? '',
            apellido1: this.pick(d, 'apellido1', 'Apellido1') ?? '',
            apellido2: this.pick(d, 'apellido2', 'Apellido2') ?? '',
            tipoidentificacion: tipoTxt
          });

          // aplica validadores según tipo cargado
          if (tipoTxt) this.setLongitudValidator(tipoTxt);
        });
    }
  }

  /** Carga ciudades y ordena alfabéticamente */
  private cargarCiudadesDesdeResumen(): void {
    this.ciudadService.getCiudades()
      .pipe(
        catchError(err => {
          console.error('Error getCiudades():', err);
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudieron cargar las ciudades.',
            showCancel: false
          });
          return of([] as CiudadResumen[]);
        })
      )
      .subscribe(list => {
        this.ciudades = (list ?? []).map((x: any) => ({
          id: Number(x.idCiudad ?? x.id_ciudad ?? x.id ?? 0),
          nombre: String(x.nombre ?? x.ciudad ?? '')
        })).filter(c => c.id > 0 && c.nombre.length > 0);

        const collator = new Intl.Collator('es', { sensitivity: 'base' });
        this.ciudades.sort((a, b) => collator.compare(a.nombre, b.nombre));
      });
  }
  trackCiudad = (_: number, c: CiudadOption) => c.id;

  /** Carga tipo contribuyente */
  private cargarTipContribuyentes(): void {
    this.tipoconService.ListadoAsiento()
      .pipe(
        catchError(err => {
          console.error('Error ListadoAsiento():', err);
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'No se pudieron cargar los tipos de contribuyente.',
            showCancel: false
          });
          return of([] as TipoContribuyenteResponse[]);
        })
      )
      .subscribe(list => {
        const mapped: TipoConOption[] = (list ?? [])
          .map(x => ({ id: Number(x.IdTipoContribuyente) || 0, nombre: String(x.Descripcion ?? '').trim() }))
          .filter(c => c.id > 0 && c.nombre.length > 0);

        const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
        mapped.sort((a, b) => collator.compare(a.nombre, b.nombre));
        this.tipocontribuyente = mapped;
      });
  }
  trackTipoCon = (_: number, c: TipoConOption) => c.id;

  guardar(): void {
    this.touchAndValidateAll(this.form);

    //valida tipo identificacion

    //
    if (this.form.invalid) {
      const faltan = this.getMissingRequired(this.form);
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario incompleto',
        message: faltan.length ? 'Faltan campos obligatorios:\n• ' + faltan.join('\n• ') : 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      this.focusFirstInvalid();
      return;
    }

    // Convertir tipo texto -> código numérico (para backend)
    const tipoTxt: string = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();
    const tipoNum = tipoTxt === 'CEDULA' ? 1 : tipoTxt === 'PASAPORTE' ? 2 : tipoTxt === 'RUC' ? 3 : 0;

    const nombreaux: string = (this.form.get('razonsocial')?.value ?? '').toString().toUpperCase();

    const raw = this.form.getRawValue();
    const data: CodigosContablesRequest = {
      ...raw,
      idCodContable: Number(raw.idCodContable ?? 0),
      identificacionauxiliar: String(raw.identificacionauxiliar ?? '').trim().toUpperCase(),
      nombreauxiliar: nombreaux, // String(raw.nombreauxiliar ?? '').trim().toUpperCase(),
      direccionauxiliar: String(raw.direccionauxiliar ?? '').trim().toUpperCase(),
      telefonoauxiliar: String(raw.telefonoauxiliar ?? ''),
      celularauxiliar: String(raw.celularauxiliar ?? ''),
      emailauxiliar: String(raw.emailauxiliar ?? ''),
      plazo: Number(raw.plazo ?? 0),
      razonsocial: String(raw.razonsocial ?? '').trim(),
      actividadComercial: String(raw.actividadComercial ?? '').trim(),
      tipopersona: String(raw.tipopersona ?? ''),
      parterelacionada: Number(raw.parterelacionada ?? 0),
      idPersona: Number(raw.idPersona ?? 0),
      idEmpresa: Number(raw.idEmpresa ?? 0),
      idCiudad: Number(raw.idCiudad ?? 0),
      idTipoContribuyente: Number(raw.idTipoContribuyente ?? 0),
      idUsuario: Number(raw.idUsuario ?? 0),
      estado: Boolean(raw.estado ?? true),
      fechaRegistro: String(raw.fechaRegistro ?? this.todayYmd()).substring(0, 10),
      nombre1: String(raw.nombre1 ?? '').trim(),
      nombre2: String(raw.nombre2 ?? '').trim(),
      apellido1: String(raw.apellido1 ?? '').trim(),
      apellido2: String(raw.apellido2 ?? '').trim(),
      // AQUÍ ya va el código numérico
      tipoidentificacion: tipoNum as any
    } as CodigosContablesRequest;

    const idForUpdate = Number(this.form.get('idCodContable')!.value || 0);
    let req$: Observable<ApiResponse<any>>;
    req$ = this.isEditMode
      ? this.codigosservice.update(idForUpdate, data) as unknown as Observable<ApiResponse<any>>
      : this.codigosservice.create(data) as unknown as Observable<ApiResponse<any>>;

    req$
      .pipe(
        catchError(() => {
          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} códigos contables.`,
            showCancel: false
          });
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) return;
        this.mostrarMensaje({
          type: 'success',
          title: 'Éxito',
          message: `Códigos contables ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`,
          showCancel: false
        }).afterClosed().subscribe(() => this.dialogRef.close(true));
      });
  }

  cancelar(): void { this.dialogRef.close(false); }

  private mostrarMensaje(data: MessageBoxData) {
    const config: MatDialogConfig<MessageBoxData> = { width: '400px', data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data } };
    return this.dialog.open<unknown, MessageBoxData, boolean>(CustomMessageBoxComponent as ComponentType<unknown>, config);
  }

  private requiredSelect: ValidatorFn = (ctrl: AbstractControl) => {
    const v = ctrl.value;
    return (v === null || v === undefined || v === 0) ? { requiredSelect: true } : null;
  };

  private todayYmd(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate() + 0).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private FIELD_LABELS: Record<string, string> = {
    idCodContable: 'ID',
    identificacionauxiliar: 'Identificación',
    fechaRegistro: 'Fecha registro',
    nombreauxiliar: 'Nombres',
    tipopersona: 'Tipo de persona',
    idCiudad: 'Ciudad',
    idTipoContribuyente: 'Contribuyente'
  };

  private touchAndValidateAll(group: FormGroup): void {
    Object.values(group.controls).forEach(c => {
      c.markAsTouched({ onlySelf: true });
      c.markAsDirty({ onlySelf: true });
      c.updateValueAndValidity({ onlySelf: true });
    });
  }

  private getMissingRequired(group: FormGroup): string[] {
    const faltantes: string[] = [];
    for (const [key, ctrl] of Object.entries(group.controls)) {
      if (!ctrl.invalid) continue;
      if (ctrl.hasError('required') || ctrl.hasError('requiredSelect')) {
        faltantes.push(this.FIELD_LABELS[key] ?? key);
        continue;
      }
      if (ctrl.hasError('pattern')) {
        faltantes.push((this.FIELD_LABELS[key] ?? key) + ' (formato inválido)');
      }
    }
    return Array.from(new Set(faltantes));
  }

  private focusFirstInvalid(): void {
    const el: HTMLElement | null = document.querySelector(`
      .form-container [formControlName].ng-invalid, 
      .form-container select.ng-invalid, 
      .form-container input.ng-invalid, 
      .form-container textarea.ng-invalid
    `);
    if (el) { (el as HTMLElement).focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  // ======= Validadores por tipo de documento =======
  private setLongitudValidator(tipo: string) {
    let min = 1, max = 20;
    const extra: any[] = [];
    if (tipo === 'CEDULA') { min = max = 10; extra.push(CustomValidators.onlyNumbers); }
    else if (tipo === 'RUC') { min = max = 13; extra.push(CustomValidators.onlyNumbers); }

    const control = this.form.get('identificacionauxiliar');
    control?.setValidators([Validators.required, Validators.minLength(min), Validators.maxLength(max), ...extra]);
    control?.updateValueAndValidity({ emitEvent: false });
  }

  get maxLengthDocumento(): number {
    const tipo = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();
    if (tipo === 'CEDULA') return 10;
    if (tipo === 'RUC') return 13;
    return 20;
  }

  onKeyDownDocumento(event: KeyboardEvent) {
    const tipo = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();
    let max = 20;
    if (tipo === 'CEDULA') max = 10;
    else if (tipo === 'RUC') max = 13;
    CustomValidators.limitInputLength(event, max);
  }

  // ======= Mapeos de respuestas =======
  private fillFromRuc(d: RucConsulta, numero: string) {
    const razonSocial = (d as any)?.razonSocial ?? (d as any)?.razon_social ?? '';
    const nombreComercial = (d as any)?.nombreComercial ?? (d as any)?.nombre_comercial ?? '';
    this.form.patchValue({
      identificacionauxiliar: numero,
      razonsocial: razonSocial,
      nombreauxiliar: (nombreComercial || razonSocial || '').toString().trim(),
      tipopersona: '02',     // jurídica
      tipoidentificacion: 'RUC' //'RUC'
    });
    this.toastOK(`Datos obtenidos correctamente para el RUC ${numero}.`);
  }

  /** RC devuelve { cedula, nombre, ... }. Hay que partir "nombre" en 4 piezas. */
  private fillFromCedula(d: any, numero: string) {
    console.log('RC:', this.stringifySafe(d));

    const nombreCompleto = (d?.nombre ?? '').toString().trim(); // "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
    const partes = nombreCompleto.split(/\s+/).filter(Boolean);

    // Estrategia segura: si vienen 4+ partes, APELLIDO1, APELLIDO2, NOMBRE1, (resto=NOMBRE2)
    let apellido1 = '', apellido2 = '', nombre1 = '', nombre2 = '';
    if (partes.length >= 4) {
      apellido1 = partes[0] ?? '';
      apellido2 = partes[1] ?? '';
      nombre1   = partes[2] ?? '';
      nombre2   = partes.slice(3).join(' ');
    } else if (partes.length === 3) {
      apellido1 = partes[0]; apellido2 = partes[1]; nombre1 = partes[2];
    } else if (partes.length === 2) {
      apellido1 = partes[0]; nombre1 = partes[1];
    } else if (partes.length === 1) {
      nombre1 = partes[0];
    }

    const nombreaux = `${nombre1} ${nombre2} ${apellido1} ${apellido2}`.replace(/\s+/g, ' ').trim();
    const razon    = `${apellido1} ${apellido2} ${nombre1} ${nombre2}`.replace(/\s+/g, ' ').trim();

    this.form.patchValue({
      identificacionauxiliar: numero,
      nombre1,
      nombre2,
      apellido1,
      apellido2,
      nombreauxiliar: nombreaux,
      razonsocial: razon,
      tipopersona: '01',           // natural
      tipoidentificacion: 'CEDULA',   //'CEDULA',
      // Si necesitas direccion / telefono desde RC, mapea aquí si existen:
      direccionauxiliar: d?.lugarDomicilio ?? '',
      // telefonoauxiliar: d?.telefono ?? '',
    });

    // Aplica validadores de CÉDULA
    this.setLongitudValidator('CEDULA');
    this.toastOK(`Datos obtenidos correctamente cédula ${numero}.`);
  }

  // ======= Evento blur del input =======
  onBlurDocumento() {
    
    //si es nuevo no hace nada
    if (!this.esNuevo) return;
    
    const numero: string = (this.form.get('identificacionauxiliar')?.value ?? '').toString().trim();
    if (!numero) return;

    // Si no está definido tipoidentificacion, inferimos por longitud
    let tipo = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();
    if (!tipo) {
      if (/^\d{13}$/.test(numero)) tipo = 'RUC';
      else if (/^\d{10}$/.test(numero)) tipo = 'CEDULA';
      else tipo = 'PASAPORTE';
      this.form.get('tipoidentificacion')?.setValue(tipo, { emitEvent: false });
    }

    // Aplica validadores de longitud por tipo
    this.setLongitudValidator(tipo);

    // Si no cumple longitud mínima, no consultamos
    if ((tipo === 'CEDULA' && numero.length !== 10) ||
        (tipo === 'RUC' && numero.length !== 13)) {
      return;
    }

    if (tipo === 'RUC') {
      this.consultaRucService.consultarRuc(numero).subscribe({
        next: (data: RucConsulta) => this.fillFromRuc(data, numero),
        error: () => this.toastError(`No se encontraron datos para el RUC ${numero}.`)
      });
      return;
    }

    if (tipo === 'CEDULA') {
      this.registroCivilService.consultarCedula(numero).subscribe({
        next: (data: any) => this.fillFromCedula(data, numero),
        error: () => this.toastError(`No se encontraron datos para la cédula ${numero}.`)
      });
      return;
    }

    // PASAPORTE: sin consulta externa
  }

  get esNuevo(): boolean {
    const id = Number(this.form?.get('idCodContable')?.value ?? 0);
    return !this.isEditMode || id === 0;
  }

  // ======= Helpers de mensajes =======
  private toastOK(message: string) {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { title: 'Información', message, type: 'success', confirmText: 'Aceptar', showCancel: false }
    });
  }
  private toastError(message: string) {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: { title: 'Atención', message, type: 'error', confirmText: 'Cerrar', showCancel: false }
    });
  }

  // ======= Util =======
  private stringifySafe(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }, 2);
  }
}
