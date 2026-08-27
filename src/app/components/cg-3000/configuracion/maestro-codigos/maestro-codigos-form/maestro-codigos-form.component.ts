import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidatorFn,
  FormControl
} from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { of, Observable } from 'rxjs';
import {
  catchError,
  map,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap
} from 'rxjs/operators';

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

import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';

import { PersonasService } from 'src/app/services/personas.service';
import { PersonaResponse } from 'src/app/interfaces/responses/persona-response';

type ApiResponse<T> = { success?: boolean; ok?: boolean; message?: string; data: T };
type CiudadOption = { id: number; nombre: string };
type TipoConOption = { id: number; nombre: string };

type PersonaOption = {
  id: number;
  label: string;   // "DOC — NOMBRES APELLIDOS"
};

@Component({
  selector: 'app-codigos-contables-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    MatOptionModule
  ],
  templateUrl: './maestro-codigos-form.component.html',
  styleUrls: ['./maestro-codigos-form.component.css']
})
export class CodigosContablesFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  usuarioActual = this.usuarioService.getUsuarioActual();

  ciudades: CiudadOption[] = [];
  tipocontribuyente: TipoConOption[] = [];

  // ===== PERSONAS (autocomplete) =====
  personaCtrl = new FormControl<PersonaOption | string | null>(null);
  filteredPersonas$: Observable<PersonaOption[]> = of([]);
  isLoadingPersonas = false;

  constructor(
    private fb: FormBuilder,
    private codigosservice: CodigosContablesService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private ciudadService: CiudadService,
    private tipoconService: TipoContribuyenteService,
    private registroCivilService: RegistroCivilService,
    private consultaRucService: ConsultaRucService,
    private personasService: PersonasService,
    public dialogRef: MatDialogRef<CodigosContablesFormComponent>,
    // 👇 aquí viene CÉDULA / RUC / PASAPORTE desde el listado
    @Inject(MAT_DIALOG_DATA)
    public data: { id?: number; tipoIdentificacion?: 'CEDULA' | 'RUC' | 'PASAPORTE' }
  ) {
    this.dialogRef.disableClose = true;// no permite salir del componente
  }

  /** Devuelve el primer valor definido/no nulo entre varios alias. */
  private pick<T = any>(obj: any, ...keys: string[]): T | null {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null) return v as T;
    }
    return null;
  }

  /** Normaliza a MAYÚSCULAS con trim */
  private toUpper(value: any): string {
   // return (value ?? '').toString().trim().toUpperCase();
    return (value ?? '').toString().toUpperCase();
  }

  /** Forzar que un control del form quede en MAYÚSCULAS mientras se escribe */
  onUppercase(controlName: string): void {
    const ctrl = this.form.get(controlName);
    if (!ctrl) { return; }
    const value = this.toUpper(ctrl.value);
    ctrl.setValue(value, { emitEvent: false });
  }


  // ==========================================================
  // INIT
  // ==========================================================
  ngOnInit(): void {
    this.form = this.fb.group({
      idCodContable: [0],
      identificacionauxiliar: ['', [Validators.required, Validators.maxLength(150)]],
      nombreauxiliar: ['', [Validators.maxLength(150)]],
      direccionauxiliar: ['', [Validators.required, Validators.maxLength(200)]],
      telefonoauxiliar: ['', [Validators.required, Validators.maxLength(30)]],
      celularauxiliar: ['', [Validators.maxLength(30)]],
      emailauxiliar: ['', [Validators.required, Validators.maxLength(150)]],
      plazo: [0],
      razonsocial: ['', [Validators.required, Validators.maxLength(200)]],
      actividadComercial: ['', [Validators.maxLength(200)]],
      tipopersona: ['01', [Validators.required]],
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
      tipoidentificacion: [{ value: '', disabled: true }],
      estadoRuc: [true],
      fechaInicioAct: [null]
    });

    this.cargarCiudadesDesdeResumen();
    this.cargarTipContribuyentes();

    // ---- Autocomplete personas: búsqueda en servidor optimizada ----
    this.filteredPersonas$ = this.personaCtrl.valueChanges.pipe(
      debounceTime(250),
      map(value => {
        const term = typeof value === 'string' ? value : value?.label ?? '';
        return term.trim();
      }),
      distinctUntilChanged(),
      switchMap(q => {
        // Si hay menos de 2 caracteres, limpiar resultados y NO llamar al servidor
        if (!q || q.length < 2) {
          this.isLoadingPersonas = false;
          return of([] as PersonaOption[]);
        }

        const esNumero = /^\d+$/.test(q);
        let fuente$: Observable<any>;

        if (esNumero) {
          // Para documentos solo buscamos cuando tenga longitud de cédula o RUC
          if (q.length !== 10 && q.length !== 13) {
            this.isLoadingPersonas = false;
            return of([] as PersonaOption[]);
          }
          fuente$ = this.personasService.buscarPersonaPorDocumento(q);
        } else {
          // Para nombres/apellidos pedimos mínimo 3 caracteres
          if (q.length < 3) {
            this.isLoadingPersonas = false;
            return of([] as PersonaOption[]);
          }
          fuente$ = this.personasService.buscarPersonasPorNombre(q);
        }

        this.isLoadingPersonas = true;

        return fuente$.pipe(
          map((resp: any) => {
            const list: PersonaResponse[] = Array.isArray(resp)
              ? resp
              : (resp?.data ?? []);
            // Nos quedamos solo con las primeras 20 coincidencias y sólo doc + nombre
            return list.slice(0, 20).map(p => this.mapPersonaToOption(p));
          }),
          catchError(err => {
            console.error('Error buscando personas:', err);
            return of([] as PersonaOption[]);
          }),
          tap(() => (this.isLoadingPersonas = false))
        );
      })
    );

    // ========= Modo edición / nuevo =========
    this.isEditMode = !!this.data?.id;

    // 🔹 NUEVO registro: viene tipoIdentificacion desde el menú
    if (!this.isEditMode && this.data?.tipoIdentificacion) {
      const tipoTxt = this.data.tipoIdentificacion.toUpperCase() as 'CEDULA' | 'RUC' | 'PASAPORTE';
      this.form.patchValue({ tipoidentificacion: tipoTxt });
      this.setLongitudValidator(tipoTxt);   // CÉDULA 10, RUC 13, PASAPORTE libre (1–20)
    }

    // 🔹 EDICIÓN: cargar datos desde API
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

          const tipoNum = Number(this.pick(d, 'tipoidentificacion', 'TipoIdentificacion', 'Tipoidentificacion') ?? 0);
          const tipoTxt = tipoNum === 1 ? 'CEDULA' : tipoNum === 2 ? 'PASAPORTE' : tipoNum === 3 ? 'RUC' : '';
          const fechaInicioRaw = this.pick(d, 'fechaInicioAct', 'FechaInicioAct');
          const idPersona = this.pick(d, 'idPersona', 'IdPersona');

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
            idPersona: idPersona ?? null,
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
            tipoidentificacion: tipoTxt,
            estadoRuc: this.pick(d, 'estadoRuc', 'EstadoRuc') ?? true,
            fechaInicioAct: fechaInicioRaw ? String(fechaInicioRaw).substring(0, 10) : null
          });

          if (tipoTxt) this.setLongitudValidator(tipoTxt);

          if (idPersona) {
            this.cargarPersonaInicial(Number(idPersona));
          }
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

  // ===== PERSONAS =====

  private armarNombrePersona(p: PersonaResponse): string {
    const partes = [
      p.primerNombre ?? '',
      p.segundoNombre ?? '',
      p.primerApellido ?? '',
      p.segundoApellido ?? ''
    ].map(x => (x || '').trim()).filter(x => x.length > 0);
    return partes.join(' ');
  }

  /** Convierte una PersonaResponse en la opción que usa el autocomplete */
  private mapPersonaToOption(p: PersonaResponse): PersonaOption {
    const nombreCompleto = this.armarNombrePersona(p);
    const label = `${p.identificacion} — ${nombreCompleto}`.trim();
    return {
      id: Number(p.personaCodigo),
      label
    };
  }

  private cargarPersonaInicial(idPersona: number): void {
    const id = Number(idPersona || 0);
    if (!id) return;

    this.personasService.getPersonaById(id).subscribe({
      next: (p: PersonaResponse) => {
        this.fillFromPersona(p);
        const opt = this.mapPersonaToOption(p);
        this.personaCtrl.setValue(opt, { emitEvent: false });
      },
      error: err => {
        console.error('Error cargar persona inicial:', err);
      }
    });
  }

  /** Llena el formulario con los datos de la persona seleccionada */
    /** Llena el formulario con los datos de la persona seleccionada */
  private fillFromPersona(p: PersonaResponse): void {
    const dir = (p.direcciones && p.direcciones.length)
      ? (p.direcciones.find(d => d.status) ?? p.direcciones[0])
      : null;

    const tel = (p.telefonos && p.telefonos.length)
      ? (p.telefonos.find(t => t.status) ?? p.telefonos[0])
      : null;

    const mail = (p.correos && p.correos.length)
      ? (p.correos.find(c => c.status) ?? p.correos[0])
      : null;

    const calle   = dir?.calle   ?? '';
    const numero  = tel?.numero  ?? '';
    const email   = mail?.email  ?? '';

    const tipoPersRaw = (p.tipoPersona || '').toUpperCase();
    let tipoPersonaCombo = '01'; // NATURAL
    if (tipoPersRaw.includes('JUR')) tipoPersonaCombo = '02';
    else if (tipoPersRaw.includes('OTRO')) tipoPersonaCombo = '03';

    let tipoDocTexto = '';
    switch (p.idTipoDocumento) {
      case 1: tipoDocTexto = 'CEDULA';    break;
      case 2: tipoDocTexto = 'PASAPORTE'; break;
      case 3: tipoDocTexto = 'RUC';       break;
      default: tipoDocTexto = '';         break;
    }

    // Razón social construida desde la persona
    const razonDesdePersona =
      `${p.primerApellido ?? ''} ${p.segundoApellido ?? ''} ${p.primerNombre ?? ''} ${p.segundoNombre ?? ''}`
        .replace(/\s+/g, ' ')
        .trim();

    // Valores actuales del formulario (lo que vino de BD)
    const razonActualForm  = (this.form.get('razonsocial')?.value ?? '').toString().trim();
    const nombreAuxActual  = (this.form.get('nombreauxiliar')?.value ?? '').toString().trim();

    const esNuevo = this.esNuevo;

    // Patch base: SIEMPRE actualiza estos datos desde persona
    const patch: any = {
      identificacionauxiliar: p.identificacion ?? '',
      nombre1: p.primerNombre ?? '',
      nombre2: p.segundoNombre ?? '',
      apellido1: p.primerApellido ?? '',
      apellido2: p.segundoApellido ?? '',
      direccionauxiliar: calle,
      telefonoauxiliar: numero,
      emailauxiliar: email,
      tipopersona: tipoPersonaCombo,
      idCiudad: p.idCiudad ?? null,
      tipoidentificacion: tipoDocTexto
    };

    // SOLO para registros nuevos se arma / cambia la razón social
    if (esNuevo) {
      const razonFinal   = (razonActualForm || razonDesdePersona).toUpperCase();
      const nombreAuxFin = (nombreAuxActual || razonFinal).toUpperCase();

      patch.razonsocial    = razonFinal;
      patch.nombreauxiliar = nombreAuxFin;
    }
    // En edición NO se tocan razonsocial ni nombreauxiliar

    this.form.patchValue(patch);

    if (tipoDocTexto) {
      this.setLongitudValidator(tipoDocTexto);
    }
  }

/*
  private fillFromPersona(p: PersonaResponse): void {
    const dir = (p.direcciones && p.direcciones.length)
      ? (p.direcciones.find(d => d.status) ?? p.direcciones[0])
      : null;

    const tel = (p.telefonos && p.telefonos.length)
      ? (p.telefonos.find(t => t.status) ?? p.telefonos[0])
      : null;

    const mail = (p.correos && p.correos.length)
      ? (p.correos.find(c => c.status) ?? p.correos[0])
      : null;

    const calle   = dir?.calle   ?? '';
    const numero  = tel?.numero  ?? '';
    const email   = mail?.email  ?? '';

    const tipoPersRaw = (p.tipoPersona || '').toUpperCase();
    let tipoPersonaCombo = '01'; // NATURAL
    if (tipoPersRaw.includes('JUR')) tipoPersonaCombo = '02';
    else if (tipoPersRaw.includes('OTRO')) tipoPersonaCombo = '03';

    let tipoDocTexto = '';
    switch (p.idTipoDocumento) {
      case 1: tipoDocTexto = 'CEDULA'; break;
      case 2: tipoDocTexto = 'PASAPORTE'; break;
      case 3: tipoDocTexto = 'RUC'; break;
      default: tipoDocTexto = ''; break;
    }

    const razonSocial =
      `${p.primerApellido ?? ''} ${p.segundoApellido ?? ''} ${p.primerNombre ?? ''} ${p.segundoNombre ?? ''}`
        .replace(/\s+/g, ' ')
        .trim();  

    this.form.patchValue({
      identificacionauxiliar: p.identificacion ?? '',
      nombre1: p.primerNombre ?? '',
      nombre2: p.segundoNombre ?? '',
      apellido1: p.primerApellido ?? '',
      apellido2: p.segundoApellido ?? '',
      razonsocial: razonSocial,
      direccionauxiliar: calle,
      telefonoauxiliar: numero,
      emailauxiliar: email,
      tipopersona: tipoPersonaCombo,
      idCiudad: p.idCiudad ?? null,
      tipoidentificacion: tipoDocTexto
    });

    if (tipoDocTexto) {
      this.setLongitudValidator(tipoDocTexto);
    }
  }

*/

  displayPersonaLabel(option: PersonaOption | string | null): string {
    if (!option) return '';
    return typeof option === 'string' ? option : option.label;
  }

  onPersonaSelected(event: MatAutocompleteSelectedEvent): void {
    const personaOpt = event.option.value as PersonaOption;
    this.form.get('idPersona')?.setValue(personaOpt.id);

    this.personasService.getPersonaById(personaOpt.id).subscribe({
      next: (p: PersonaResponse) => {
        this.fillFromPersona(p);
      },
      error: err => {
        console.error('Error getPersonaById:', err);
        this.toastError('No se pudieron cargar los datos de la persona seleccionada.');
      }
    });
  }

  // ==========================================================
  // GUARDAR
  // ==========================================================

  /*
  guardar(): void {
    this.touchAndValidateAll(this.form);

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

    const tipoTxt: string = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();
    const tipoNum = tipoTxt === 'CEDULA' ? 1 : tipoTxt === 'PASAPORTE' ? 2 : tipoTxt === 'RUC' ? 3 : 0;

    const nombreaux: string = (this.form.get('razonsocial')?.value ?? '').toString().toUpperCase();
    const raw = this.form.getRawValue();

    //validaciones de razon social////
    const esNuevo = this.esNuevo;
    let razonSocialFinal = this.toUpper(String(raw.razonsocial ?? '').trim());
    let nombreAuxFinal   = this.toUpper(String(raw.nombreauxiliar ?? '').trim());
      
    if (esNuevo) {
          const apellido1 = this.toUpper(String(raw.apellido1 ?? '').trim());
          const apellido2 = this.toUpper(String(raw.apellido2 ?? '').trim());
          const nombre1   = this.toUpper(String(raw.nombre1 ?? '').trim());
          const nombre2   = this.toUpper(String(raw.nombre2 ?? '').trim());

          const unionNombres = `${apellido1} ${apellido2} ${nombre1} ${nombre2}`
            .replace(/\s+/g, ' ')
            .trim();
          // 1) razonsocial:
          //    - si tiene datos -> se queda ese valor
          //    - si está vacía -> se usa la unión
          if (!razonSocialFinal && unionNombres) {
            razonSocialFinal = unionNombres;
          }

          // Convertir razón social a MAYÚSCULAS
          if (razonSocialFinal) {
            razonSocialFinal = razonSocialFinal.toUpperCase();
          }

          // 2) nombreauxiliar:
          //    - siempre toma razón social final
          //    - si razón social está vacía -> unión de apellidos+nombres
          if (razonSocialFinal) {
            nombreAuxFinal = razonSocialFinal;
          } else {
            nombreAuxFinal = unionNombres;
          }
          // nombreauxiliar también en MAYÚSCULAS
          if (nombreAuxFinal) {
            nombreAuxFinal = nombreAuxFinal.toUpperCase();
          }
        } else {
          // EDICIÓN: respetar lo que viene de BD / formulario
          razonSocialFinal = this.toUpper(String(raw.razonsocial ?? '').trim());
          nombreAuxFinal   = this.toUpper(String(raw.nombreauxiliar ?? '').trim());
    }

    /////
    const fechaInicioActRaw: string | null =
      raw.fechaInicioAct && String(raw.fechaInicioAct).trim().length > 0
        ? String(raw.fechaInicioAct).substring(0, 10)
        : null;

    const estadoRucBool: boolean =
      typeof raw.estadoRuc === 'string'
        ? ['ACTIVO', 'TRUE', '1'].includes(raw.estadoRuc.toString().toUpperCase())
        : Boolean(raw.estadoRuc);

    const data: CodigosContablesRequest = {
      ...raw,
      idCodContable: Number(raw.idCodContable ?? 0),
      identificacionauxiliar: String(raw.identificacionauxiliar ?? '').trim().toUpperCase(),
      nombreauxiliar: nombreAuxFinal,    ////nombreaux,
      direccionauxiliar: String(raw.direccionauxiliar ?? '').trim().toUpperCase(),
      telefonoauxiliar: String(raw.telefonoauxiliar ?? ''),
      celularauxiliar: String(raw.celularauxiliar ?? ''),
      emailauxiliar: String(raw.emailauxiliar ?? ''),
      plazo: Number(raw.plazo ?? 0),
      razonsocial:razonSocialFinal, /// String(raw.razonsocial ?? '').trim(),
      actividadComercial: String(raw.actividadComercial ?? '').trim().toLocaleUpperCase(),
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
      tipoidentificacion: tipoNum as any,
      EstadoRuc: estadoRucBool,
      FechaInicioAct: fechaInicioActRaw
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
  */

    guardar(): void {
    this.touchAndValidateAll(this.form);

    if (this.form.invalid) {
      const faltan = this.getMissingRequired(this.form);
      this.mostrarMensaje({
        type: 'warning',
        title: 'Formulario incompleto',
        message: faltan.length
          ? 'Faltan campos obligatorios:\n• ' + faltan.join('\n• ')
          : 'Completa todos los campos obligatorios.',
        showCancel: false
      });
      this.focusFirstInvalid();
      return;
    }

    const tipoTxt: string = (this.form.get('tipoidentificacion')?.value ?? '')
      .toString()
      .toUpperCase();
    const tipoNum =
      tipoTxt === 'CEDULA' ? 1 :
      tipoTxt === 'PASAPORTE' ? 2 :
      tipoTxt === 'RUC' ? 3 : 0;

    const raw = this.form.getRawValue();

    // >>> Aquí YA NO SE ARMA NADA, solo se respeta lo que hay en los campos
    const razonSocialFinal = this.toUpper(raw.razonsocial);
    const nombreAuxFinal   = this.toUpper(raw.nombreauxiliar);

    const fechaInicioActRaw: string | null =
      raw.fechaInicioAct && String(raw.fechaInicioAct).trim().length > 0
        ? String(raw.fechaInicioAct).substring(0, 10)
        : null;

    const estadoRucBool: boolean =
      typeof raw.estadoRuc === 'string'
        ? ['ACTIVO', 'TRUE', '1'].includes(raw.estadoRuc.toString().toUpperCase())
        : Boolean(raw.estadoRuc);

    const data: CodigosContablesRequest = {
      ...raw,

      idCodContable: Number(raw.idCodContable ?? 0),

      // TEXTOS EN MAYÚSCULAS (Respetando lo que puso el usuario)
      identificacionauxiliar: this.toUpper(raw.identificacionauxiliar),
      nombreauxiliar: nombreAuxFinal.trim(),
      direccionauxiliar: this.toUpper(raw.direccionauxiliar).trim(),
      telefonoauxiliar: String(raw.telefonoauxiliar ?? ''), // numérico
      celularauxiliar: String(raw.celularauxiliar ?? ''),   // numérico
      emailauxiliar: this.toUpper(raw.emailauxiliar).trim(),
      plazo: Number(raw.plazo ?? 0),
      razonsocial: razonSocialFinal.trim(),
      actividadComercial: this.toUpper(raw.actividadComercial).trim(),
      tipopersona: this.toUpper(raw.tipopersona),
      parterelacionada: Number(raw.parterelacionada ?? 0),

      idPersona: Number(raw.idPersona ?? 0),
      idEmpresa: Number(raw.idEmpresa ?? 0),
      idCiudad: Number(raw.idCiudad ?? 0),
      idTipoContribuyente: Number(raw.idTipoContribuyente ?? 0),
      idUsuario: Number(raw.idUsuario ?? 0),
      estado: Boolean(raw.estado ?? true),

      fechaRegistro: String(raw.fechaRegistro ?? this.todayYmd()).substring(0, 10),

      // Nombres y apellidos también en MAYÚSCULAS
      nombre1: this.toUpper(raw.nombre1).trim(),
      nombre2: this.toUpper(raw.nombre2).trim(),
      apellido1: this.toUpper(raw.apellido1).trim(),
      apellido2: this.toUpper(raw.apellido2).trim(),

      tipoidentificacion: tipoNum as any,
      EstadoRuc: estadoRucBool,
      FechaInicioAct: fechaInicioActRaw
    } as CodigosContablesRequest;

    const idForUpdate = Number(this.form.get('idCodContable')!.value || 0);

    const req$: Observable<ApiResponse<any>> = this.isEditMode
      ? (this.codigosservice.update(idForUpdate, data) as unknown as Observable<ApiResponse<any>>)
      : (this.codigosservice.create(data) as unknown as Observable<ApiResponse<any>>);

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
    const config: MatDialogConfig<MessageBoxData> = {
      width: '400px',
      data: { confirmText: 'Aceptar', cancelText: 'Cancelar', ...data }
    };
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
    if (el) {
      (el as HTMLElement).focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /** 
   * CÉDULA => 10 dígitos numéricos
   * RUC     => 13 dígitos numéricos
   * PASAPORTE => libre (1–20 caracteres, sin numeric-only)
   */
  private setLongitudValidator(tipo: string) {
    let min = 1, max = 20;
    const extra: any[] = [];

    const t = (tipo || '').toUpperCase();
    if (t === 'CEDULA') {
      min = max = 10;
      extra.push(CustomValidators.onlyNumbers);
    } else if (t === 'RUC') {
      min = max = 13;
      extra.push(CustomValidators.onlyNumbers);
    }
    // PASAPORTE: se queda 1–20, sin numeric-only

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
    // PASAPORTE => 20
    CustomValidators.limitInputLength(event, max);
  }

  private fillFromRuc(d: RucConsulta, numero: string) {
    const razonSocial = (d as any)?.razonSocial ?? (d as any)?.razon_social ?? '';
    const nombreComercial = (d as any)?.nombreComercial ?? (d as any)?.nombre_comercial ?? '';
    const infoFechas = (d as any)?.informacionFechasContribuyente ?? {};
    const fechaInicioAct: string = infoFechas?.fechaInicioActividades ?? '';
    const fechaInicioYmd = fechaInicioAct ? String(fechaInicioAct).substring(0, 10) : '';
    const ActividadComercial = (d as any)?.actividadEconomicaPrincipal ?? (d as any)?.actividadEconomicaPrincipal ?? '';
    const estadoRucStr: string = (d as any)?.estadoContribuyenteRuc ?? '';
    const estadoRucBool = estadoRucStr.toUpperCase() === 'ACTIVO';


     // Normalizar razón social a MAYÚSCULAS
    const razonUpper = this.toUpper(razonSocial).trim();
    const { nombre1, nombre2, apellido1, apellido2 } =
    this.splitRazonSocialEnNombres(razonUpper);

    this.form.patchValue({
      identificacionauxiliar: numero,
      razonsocial: razonUpper,//razonSocial,
      nombreauxiliar: (nombreComercial || razonSocial || '').toString().trim(),
      tipopersona: '02',
      tipoidentificacion: 'RUC',
      actividadComercial: ActividadComercial,
      estadoRuc: estadoRucBool,
      fechaInicioAct: fechaInicioYmd,
      nombre1,
      nombre2,
      apellido1,
      apellido2
    });
    this.toastOK(`Datos obtenidos correctamente para el RUC ${numero}.`);
  }

  private fillFromCedula(d: any, numero: string) {
    console.log('RC:', this.stringifySafe(d));

    const nombreCompleto = (d?.nombre ?? '').toString().trim();
    const partes = nombreCompleto.split(/\s+/).filter(Boolean);

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
    const fechaNacimiento2 = this.toYmd(d?.fechaNacimiento);

    this.form.patchValue({
      identificacionauxiliar: numero,
      nombre1,
      nombre2,
      apellido1,
      apellido2,
      nombreauxiliar: nombreaux,
      razonsocial: razon,
      tipopersona: '01',
      tipoidentificacion: 'CEDULA',
      direccionauxiliar: d?.calleDomicilio ?? '',
      fechaInicioAct: fechaNacimiento2
    });

    this.setLongitudValidator('CEDULA');
    this.toastOK(`Datos obtenidos correctamente cédula ${numero}.`);
  }

  /**
   * Blur del campo identificación:
   * - Si es PASAPORTE => NO llama APIs (solo deja la validación genérica).
   * - Si es CÉDULA/RUC => valida longitud y llama a los servicios.
   */
  onBlurDocumento() {
    if (!this.esNuevo) return;

    const numero: string = (this.form.get('identificacionauxiliar')?.value ?? '').toString().trim();
    if (!numero) return;

    let tipo = (this.form.get('tipoidentificacion')?.value ?? '').toString().toUpperCase();

    // Si viene desde el menú como PASAPORTE, no hacemos nada de APIs
    if (tipo === 'PASAPORTE') {
      this.setLongitudValidator('PASAPORTE');
      return;
    }

    // Si no hay tipo (caso antiguo), se intenta deducir por longitud
    if (!tipo) {
      if (/^\d{13}$/.test(numero)) tipo = 'RUC';
      else if (/^\d{10}$/.test(numero)) tipo = 'CEDULA';
      else tipo = 'PASAPORTE';
      this.form.get('tipoidentificacion')?.setValue(tipo, { emitEvent: false });

      // Si se deduce PASAPORTE aquí, tampoco se llaman APIs
      if (tipo === 'PASAPORTE') {
        this.setLongitudValidator('PASAPORTE');
        return;
      }
    }

    this.setLongitudValidator(tipo);

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
  }

  get esNuevo(): boolean {
    const id = Number(this.form?.get('idCodContable')?.value ?? 0);
    return !this.isEditMode || id === 0;
  }

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

  //formato fecah que viene del registro civil
  private toYmd(fecha: any): string {
    if (!fecha) return '';

    const s = String(fecha).trim();

    // ya viene en formato ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }

    // viene como DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }

    // viene como DD-MM-AAAA
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }

    return '';
  }

  //numeros
  soloNumeros(event: KeyboardEvent): void {
    const key = event.key;

    // Teclas de control que sí permitimos
    const controlKeys = [
      'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight',
      'Home', 'End'
    ];
    if (controlKeys.includes(key)) {
      return; // no bloquear
    }

    // Si no es un dígito, cancelar
    if (!/^[0-9]$/.test(key)) {
      event.preventDefault();
    }
  }

  /**
   * Evita pegar contenido que no sea numérico.
   */
  soloNumerosPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^\d*$/.test(pasted)) {
      event.preventDefault();
    }
  }
  // llena campos 

  private splitRazonSocialEnNombres(razon: string): {
    nombre1: string;
    nombre2: string;
    apellido1: string;
    apellido2: string;
  } {
    const partes = (razon || '')
      .trim()
      .split(/\s+/)
      .filter(p => p.length > 0);

    let nombre1 = '';
    let nombre2 = '';
    let apellido1 = '';
    let apellido2 = '';

    if (partes.length >= 4) {
      nombre1 = partes[0];
      nombre2 = partes[1];
      apellido1 = partes[2];
      apellido2 = partes.slice(3).join(' ');
    } else if (partes.length === 3) {
      nombre1 = partes[0];
      nombre2 = partes[1];
      apellido1 = partes[2];
    } else if (partes.length === 2) {
      nombre1 = partes[0];
      apellido1 = partes[1];
    } else if (partes.length === 1) {
      nombre1 = partes[0];
    }

    return { nombre1, nombre2, apellido1, apellido2 };
  }
  //
  //
}
