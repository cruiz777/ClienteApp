import { Component, OnInit, signal, DestroyRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, startWith, map, debounceTime } from 'rxjs/operators';
import { Observable, of, merge } from 'rxjs';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter,
  MatDateFormats
} from '@angular/material/core';

import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { ActivoFijoApiService, ActivoFijoDto } from 'src/app/services/activos-fijos.service';
import { PlanActivosService, PlanCuentaMiniDto } from 'src/app/services/plan-activos.service';
import { MarcaCgService, MarcaCgDto } from 'src/app/services/marca-cg.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { DepartamentosActivosService, DepartamentoDto } from 'src/app/services/departamentos-activos.service';

export const MY_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'dd/MM/yyyy' },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MM/yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MM/yyyy',
  },
};

export class AppDateAdapter extends NativeDateAdapter {
  override parse(value: any, parseFormat: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    if (typeof value === 'string') {
      const s = value.trim();

      if (s.includes('T') && s.length >= 10) {
        const ymd = s.substring(0, 10);
        const [y, m, d] = ymd.split('-').map(Number);
        if (y && m && d) return new Date(y, m - 1, d);
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }

      const parts = s.split('/');
      if (parts.length === 3) {
        const dd = Number(parts[0]);
        const mm = Number(parts[1]);
        const yyyy = Number(parts[2]);
        if (yyyy && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return new Date(yyyy, mm - 1, dd);
        }
      }
    }

    return super.parse(value, parseFormat);
  }

  override format(date: Date, displayFormat: any): string {
    if (!date || isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}

@Component({
  selector: 'app-activos-fijos-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './activos-fijos-form.component.html',
  styleUrls: ['./activos-fijos-form.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: AppDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class ActivosFijosFormComponent implements OnInit {
  form!: FormGroup;
  idActivo: number | null = null;

  loading = signal(false);
  saving = signal(false);
  titulo = signal('Nuevo Activo Fijo');

  // ===== Overlay / Cargando catálogos =====
  catalogPending = signal(0);

  busy = computed(() =>
    this.loading() || this.saving() || this.catalogPending() > 0
  );

  busyText = computed(() => {
    if (this.saving()) return 'Guardando, por favor espere...';
    if (this.loading()) return 'Cargando activo, por favor espere...';
    if (this.catalogPending() > 0) return 'Cargando catálogos, por favor espere...';
    return 'Procesando...';
  });

  private beginCatalog(): void {
    this.catalogPending.update(v => v + 1);
  }

  private endCatalog(): void {
    this.catalogPending.update(v => Math.max(0, v - 1));
  }

  usuarioActual: any = null;
  private readonly destroyRef = inject(DestroyRef);

  // ============================
  // Plan de cuentas (mini) - PRINCIPAL
  // ============================
  private readonly cuentasActivosFijos = [
    '120101-001',
    '120102-001',
    '120103-001',
    '120104-001',
    '120105-001',
    '120106-001'
  ];

  planMini: PlanCuentaMiniDto[] = [];
  planMiniFiltered$: Observable<PlanCuentaMiniDto[]> = of([]);
  private pendingIdPlanCuentas: number | null = null;

  // ============================
  // Plan nivel 5 (Ctacontable1..5)
  // ============================
  planMiniNivel5: PlanCuentaMiniDto[] = [];
  extraFiltered: Record<number, Observable<PlanCuentaMiniDto[]>> = {
    1: of([]), 2: of([]), 3: of([]), 4: of([]), 5: of([])
  };

  // ============================
  // MarcaCg (estado)
  // ============================
  marcas: MarcaCgDto[] = [];
  marcasFiltered$: Observable<MarcaCgDto[]> = of([]);
  private pendingIdMarca: number | null = null;

  // ============================
  // Departamentos
  // ============================
  departamentos: DepartamentoDto[] = [];
  departamentosFiltered$: Observable<DepartamentoDto[]> = of([]);
  private pendingIdDepartamento: number | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ActivoFijoApiService,
    private planApi: PlanActivosService,
    private marcaApi: MarcaCgService,
    private departamentosApi: DepartamentosActivosService,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
    private dateAdapter: DateAdapter<Date>,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.buildForm();

    if (this.usuarioActual) {
      this.form.patchValue(
        {
          IdEmpesa: this.usuarioActual.id_empresa ?? null, // typo backend
          IdUsuario: this.usuarioActual.id_usuario ?? null,
          usuario: this.usuarioActual.nombre_usuario ?? ''
        },
        { emitEvent: false }
      );
    }

    // catálogos
    this.cargarCatalogoCuentas();       // principal
    this.cargarCatalogoCuentasNivel5(); // Ctacontable1..5
    this.cargarCatalogoMarcas();
    this.cargarCatalogoDepartamentos();

    const id = this.route.snapshot.paramMap.get('id');
    this.idActivo = id ? Number(id) : null;

    if (this.idActivo) {
      this.titulo.set(`Editar Activo Fijo #${this.idActivo}`);
      this.load(this.idActivo);
    }

    this.hookRecalculos();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      codigo: [''],
      codigoBarras: [''],

      idPlanCuentas: [null, Validators.required],
      cuentaPresentacion: [null],   // ahora puede ser OBJETO
      cuentaNombre: [''],

      descripcion: ['', [Validators.required, Validators.maxLength(300)]],
      noSeriePlaca: [''],
      marcaTexto: [''],
      modelo: [''],
      color: [''],

      idMarca: [null, Validators.required],
      estadoNombre: [''],

      IdDepartamento: [null, Validators.required],
      departamentoNombre: [''],

      ubicacion: [''],
      custodio: [''],
      numeroPoliza: [''],
      activoIntangible: [false],

      observaciones: [''],
      usuario: [''],

      imagenBase64: [null],
      imagenMimeType: [null],

      comprobanteDiario: [''],
      fechaCompra: [null],
      fechaCompraReal:[null],
      proveedor: [''],
      noComprobante: [''],
      noComprobanteRet: [''],

      valorCompra: [0, [Validators.min(0)]],
      valorResidual: [0, [Validators.min(0)]],

      // ✅ vidaUtil ahora admite decimales (ej: 3.03)
      vidaUtil: [0, [Validators.min(0)]],

      Tipcod: [null],
      Destipcod: [''],
      Local: [null],

      Tiempodeprec: [0, [Validators.min(0)]],
      TiempodeprecMes: [0, [Validators.min(0)]],
      TiempodeprecDia: [0, [Validators.min(0)]],

      // Ctacontable1..5 (NIVEL 5)
      Ctacontable1: [null],
      Ctacontable2: [null],
      Ctacontable3: [null],
      Ctacontable4: [null],
      Ctacontable5: [null],

      IdPlanCuentas1: [null],
      IdPlanCuentas2: [null],
      IdPlanCuentas3: [null],
      IdPlanCuentas4: [null],
      IdPlanCuentas5: [null],

      CtaNombre1: [''],
      CtaNombre2: [''],
      CtaNombre3: [''],
      CtaNombre4: [''],
      CtaNombre5: [''],

      ValorRazonable: [0, [Validators.min(0)]],
      VidaUtilTotal: [0, [Validators.min(0)]],
      AjusteIncremento: [null],

      SaldoVidaUtil: [null],
      NvaDepresiacionAnual: [null],

      FechaajusteNiifs: [''],
      DepresiacionAnual: [null],
      DepresiacionMensual: [null],
      DepreMensual: [null],
      ValorLibros: [null],

      // ✅ Aquí tú ingresarás 0.33 (o 33)
      PorcentajeDepresiacion: [null],

      DepDeducibleSri: [null],
      DepNoDeducibleNiifs: [null],
      PorcentajeDepreciado: [null],
      DepreAcumulada: [null],

      DebeCuenta1: [0, [Validators.min(0)]],
      HaberCuenta1: [0, [Validators.min(0)]],
      DebeCuenta2: [0, [Validators.min(0)]],
      HaberCuenta2: [0, [Validators.min(0)]],
      DebeCuenta3: [0, [Validators.min(0)]],
      HaberCuenta3: [0, [Validators.min(0)]],

      Debecuenta4: [0, [Validators.min(0)]],
      Habercuenta4: [0, [Validators.min(0)]],
      Debecuenta5: [0, [Validators.min(0)]],
      Habercuenta5: [0, [Validators.min(0)]],

      FechaDepreciacion: [null],
      FechaDeprecia: [null],
      FechaIngreso: [null],
      HoraIngreso: [null],

      PathImagenActivo: [null],

      IdEmpesa: [null],
      IdUsuario: [null]
    });
  }

  // ============================
  // displayWith (sirve para todos)
  // ============================
  displayCuenta = (row?: PlanCuentaMiniDto | string | null): string => {
    if (!row) return '';
    return typeof row === 'string' ? row : (row.CuentaPresentacion ?? '');
  };

  // ============================
  // CATALOGO PRINCIPAL (6 cuentas)
  // ============================
  private cargarCatalogoCuentas(): void {
    this.beginCatalog();

    this.planApi.getMiniByPresentacion(this.cuentasActivosFijos)
      .pipe(finalize(() => this.endCatalog()))
      .subscribe({
        next: (rows: PlanCuentaMiniDto[]) => {
          this.planMini = rows ?? [];

          const ctrl = this.form.get('cuentaPresentacion');
          this.planMiniFiltered$ = (ctrl?.valueChanges ?? of('')).pipe(
            startWith(ctrl?.value ?? ''),
            map((val: any) => this.filtrarPlanMini(this.planMini, val))
          );

          if (this.pendingIdPlanCuentas != null) {
            this.form.patchValue({ idPlanCuentas: this.pendingIdPlanCuentas }, { emitEvent: false });
            this.pendingIdPlanCuentas = null;
          }

          this.syncCuentaDesdeIdPlan();
        },
        error: (err: any) => console.error('Error cargando PlanCuentas mini', err)
      });
  }

  private filtrarPlanMini(source: PlanCuentaMiniDto[], val: any): PlanCuentaMiniDto[] {
    const txt =
      typeof val === 'string'
        ? val
        : `${val?.CuentaPresentacion ?? ''} ${val?.NombreCuenta ?? ''}`;

    const t = String(txt ?? '').trim().toLowerCase();
    if (!t) return source.slice();

    return source.filter(x =>
      (x.CuentaPresentacion ?? '').toLowerCase().includes(t) ||
      (x.NombreCuenta ?? '').toLowerCase().includes(t)
    );
  }

  onCuentaSelectedRow(row: PlanCuentaMiniDto): void {
    if (!row) return;
    this.form.patchValue({
      idPlanCuentas: row.IdPlanCuentas,
      cuentaPresentacion: row,
      cuentaNombre: row.NombreCuenta
    }, { emitEvent: false });
  }

  onCuentaBlur(): void {
    const val = this.form.get('cuentaPresentacion')?.value;

    if (val && typeof val === 'object' && (val as any).IdPlanCuentas) {
      this.form.patchValue({
        idPlanCuentas: (val as any).IdPlanCuentas,
        cuentaNombre: (val as any).NombreCuenta
      }, { emitEvent: false });
      return;
    }

    const pres = String(val ?? '').trim();
    const match = this.planMini.find(x => String(x.CuentaPresentacion ?? '').trim() === pres);

    if (!match) {
      this.form.patchValue({ idPlanCuentas: null, cuentaNombre: '' }, { emitEvent: false });
    } else {
      this.form.patchValue({
        idPlanCuentas: match.IdPlanCuentas,
        cuentaNombre: match.NombreCuenta
      }, { emitEvent: false });
    }
  }

  private syncCuentaDesdeIdPlan(): void {
    const id = this.form.get('idPlanCuentas')?.value;
    if (!id || !this.planMini?.length) return;

    const match = this.planMini.find(x => x.IdPlanCuentas === Number(id));
    if (!match) return;

    this.form.patchValue({
      cuentaPresentacion: match,
      cuentaNombre: match.NombreCuenta
    }, { emitEvent: false });
  }

  // ============================
  // NIVEL 5 (Ctacontable1..5)
  // ============================
  private cargarCatalogoCuentasNivel5(): void {
    this.beginCatalog();

    this.planApi.getMiniNivel5()
      .pipe(finalize(() => this.endCatalog()))
      .subscribe({
        next: (rows: PlanCuentaMiniDto[]) => {
          this.planMiniNivel5 = rows ?? [];
          this.initExtraCuentasAutoNivel5();
          this.syncExtraCuentasDesdeIdNivel5();
        },
        error: (err: any) => console.error('Error cargando PlanCuentas nivel 5', err)
      });
  }

  private initExtraCuentasAutoNivel5(): void {
    const mk = (idx: number) => {
      const ctrl = this.form.get(`Ctacontable${idx}`);
      this.extraFiltered[idx] = (ctrl?.valueChanges ?? of('')).pipe(
        startWith(ctrl?.value ?? ''),
        map((val: any) => this.filtrarPlanMini(this.planMiniNivel5, val))
      );
    };
    [1, 2, 3, 4, 5].forEach(mk);
  }

  onExtraCuentaSelectedRow(idx: number, row: PlanCuentaMiniDto): void {
    if (!row) return;

    this.form.patchValue({
      [`IdPlanCuentas${idx}`]: row.IdPlanCuentas,
      [`Ctacontable${idx}`]: row,
      [`CtaNombre${idx}`]: row.NombreCuenta
    }, { emitEvent: false });
  }

  onExtraCuentaBlur(idx: number): void {
    const val = this.form.get(`Ctacontable${idx}`)?.value;

    if (val && typeof val === 'object' && (val as any).IdPlanCuentas) {
      this.form.patchValue({
        [`IdPlanCuentas${idx}`]: (val as any).IdPlanCuentas,
        [`CtaNombre${idx}`]: (val as any).NombreCuenta
      }, { emitEvent: false });
      return;
    }

    const pres = String(val ?? '').trim();
    const match = this.planMiniNivel5.find(x => String(x.CuentaPresentacion ?? '').trim() === pres);

    if (!match) {
      this.form.patchValue({
        [`IdPlanCuentas${idx}`]: null,
        [`CtaNombre${idx}`]: '',
      }, { emitEvent: false });
      return;
    }

    this.form.patchValue({
      [`IdPlanCuentas${idx}`]: match.IdPlanCuentas,
      [`Ctacontable${idx}`]: match,
      [`CtaNombre${idx}`]: match.NombreCuenta
    }, { emitEvent: false });
  }

  private syncExtraCuentasDesdeIdNivel5(): void {
    if (!this.planMiniNivel5?.length) return;

    [1, 2, 3, 4, 5].forEach(idx => {
      const id = this.form.get(`IdPlanCuentas${idx}`)?.value;
      if (!id) return;

      const match = this.planMiniNivel5.find(x => x.IdPlanCuentas === Number(id));
      if (!match) return;

      this.form.patchValue({
        [`Ctacontable${idx}`]: match,
        [`CtaNombre${idx}`]: match.NombreCuenta
      }, { emitEvent: false });
    });
  }

  // ============================
  // MARCAS
  // ============================
  private cargarCatalogoMarcas(): void {
    this.beginCatalog();

    this.marcaApi.getAll()
      .pipe(finalize(() => this.endCatalog()))
      .subscribe({
        next: (rows: MarcaCgDto[]) => {
          this.marcas = rows ?? [];

          const ctrl = this.form.get('estadoNombre');
          this.marcasFiltered$ = (ctrl?.valueChanges ?? of('')).pipe(
            startWith(ctrl?.value ?? ''),
            map((txt: string) => this.filtrarMarcas(String(txt ?? '')))
          );

          if (this.pendingIdMarca != null) {
            this.form.patchValue({ idMarca: this.pendingIdMarca }, { emitEvent: false });
            this.pendingIdMarca = null;
          }

          this.syncEstadoDesdeIdMarca();
        },
        error: (err: any) => console.error('Error cargando MarcaCg', err)
      });
  }

  private filtrarMarcas(txt: string): MarcaCgDto[] {
    const t = txt.trim().toLowerCase();
    if (!t) return this.marcas.slice();
    return this.marcas.filter(x =>
      (x.Desmar ?? '').toLowerCase().includes(t) ||
      (x.Tipmar ?? '').toLowerCase().includes(t)
    );
  }

  onEstadoSelected(desmar: string): void {
    const val = (desmar ?? '').trim();
    const match = this.marcas.find(x => (x.Desmar ?? '').trim() === val);

    if (!match) {
      this.form.patchValue({ idMarca: null, estadoNombre: '' }, { emitEvent: false });
      return;
    }

    this.form.patchValue({
      idMarca: match.IdMarca,
      estadoNombre: match.Desmar ?? ''
    }, { emitEvent: false });
  }

  onEstadoBlur(): void {
    const val = String(this.form.get('estadoNombre')?.value ?? '').trim();
    const match = this.marcas.find(x => (x.Desmar ?? '').trim() === val);

    if (!match) {
      this.form.patchValue({ idMarca: null }, { emitEvent: false });
    } else {
      this.form.patchValue({ idMarca: match.IdMarca, estadoNombre: match.Desmar ?? '' }, { emitEvent: false });
    }
  }

  private syncEstadoDesdeIdMarca(): void {
    const id = this.form.get('idMarca')?.value;
    if (!id || !this.marcas?.length) return;

    const match = this.marcas.find(x => x.IdMarca === Number(id));
    if (!match) return;

    this.form.patchValue({ estadoNombre: match.Desmar ?? '' }, { emitEvent: false });
  }

  // ============================
  // DEPARTAMENTOS
  // ============================
  private cargarCatalogoDepartamentos(): void {
    const idEmpresa = Number(this.usuarioActual?.id_empresa ?? 0);
    if (!idEmpresa) return;

    this.beginCatalog();

    this.departamentosApi.getAll(idEmpresa)
      .pipe(finalize(() => this.endCatalog()))
      .subscribe({
        next: (rows: DepartamentoDto[]) => {
          this.departamentos = rows ?? [];

          const ctrl = this.form.get('departamentoNombre');
          this.departamentosFiltered$ = (ctrl?.valueChanges ?? of('')).pipe(
            startWith(ctrl?.value ?? ''),
            map((txt: string) => this.filtrarDepartamentos(String(txt ?? '')))
          );

          if (this.pendingIdDepartamento != null) {
            this.form.patchValue({ IdDepartamento: this.pendingIdDepartamento }, { emitEvent: false });
            this.pendingIdDepartamento = null;
          }

          this.syncDepartamentoDesdeId();
        },
        error: (err: any) => console.error('Error cargando Departamentos', err)
      });
  }

  private filtrarDepartamentos(txt: string): DepartamentoDto[] {
    const t = txt.trim().toLowerCase();
    if (!t) return this.departamentos.slice();
    return this.departamentos.filter(x =>
      (x.Nombre ?? '').toLowerCase().includes(t) ||
      (x.Cuenta ?? '').toLowerCase().includes(t)
    );
  }

  onDepartamentoSelected(nombre: string): void {
    const n = (nombre ?? '').trim();
    const dep = this.departamentos.find(d => (d.Nombre ?? '').trim() === n);

    if (!dep) {
      this.form.patchValue({ IdDepartamento: null, departamentoNombre: '' }, { emitEvent: false });
      return;
    }

    this.form.patchValue({
      IdDepartamento: dep.IdDepartamento,
      departamentoNombre: dep.Nombre ?? ''
    }, { emitEvent: false });
  }

  onDepartamentoBlur(): void {
    const val = String(this.form.get('departamentoNombre')?.value ?? '').trim();
    const match = this.departamentos.find(x => (x.Nombre ?? '').trim() === val);

    if (!match) {
      this.form.patchValue({ IdDepartamento: null }, { emitEvent: false });
    } else {
      this.form.patchValue({ IdDepartamento: match.IdDepartamento }, { emitEvent: false });
    }
  }

  private syncDepartamentoDesdeId(): void {
    const id = this.form.get('IdDepartamento')?.value;
    if (!id || !this.departamentos?.length) return;

    const match = this.departamentos.find(x => x.IdDepartamento === Number(id));
    if (!match) return;

    this.form.patchValue({ departamentoNombre: match.Nombre ?? '' }, { emitEvent: false });
  }

  // ============================
  // LOAD
  // ============================
  private load(id: number): void {
    this.loading.set(true);

    this.api.getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: ActivoFijoDto | null) => {
          if (!data) return;
          const d: any = data;

          const idPlan = d.IdPlanCuentas ?? null;
          const idMarca = d.IdMarca ?? null;
          const idDepto = d.IdDepartamento ?? null;

          if (!this.planMini?.length && idPlan != null) this.pendingIdPlanCuentas = Number(idPlan);
          if (!this.marcas?.length && idMarca != null) this.pendingIdMarca = Number(idMarca);
          if (!this.departamentos?.length && idDepto != null) this.pendingIdDepartamento = Number(idDepto);

          this.form.patchValue({
            codigo: d.CodigoAf ?? 0,
            codigoBarras: d.Codigobarra ?? '',
            descripcion: d.Descripcion ?? '',
            noSeriePlaca: d.Serie ?? '',
            marcaTexto: d.Marca ?? '',
            modelo: d.Model ?? '',
            color: d.Color ?? '',

            idPlanCuentas: idPlan,

            idMarca: idMarca,
            estadoNombre: '',

            IdDepartamento: idDepto,
            departamentoNombre: '',

            ubicacion: d.Ubicacion ?? '',
            custodio: d.Custodio ?? '',
            proveedor: d.Proveedor ?? '',
            comprobanteDiario: d.ComprobanteDiario ?? '',
            noComprobante: d.Comprobante ?? '',
            noComprobanteRet: d.ComprobanteRet ?? '',
            numeroPoliza: d.Poliza ?? '',

            valorCompra: d.Valorcompra ?? null,
            valorResidual: d.Valorresidual ?? 0,

            // ✅ vidaUtil ahora decimal
            vidaUtil: d.Vidautil ?? null,

            fechaCompra: this.dateAdapter.parse(d.Feccompra, MY_DATE_FORMATS.parse.dateInput) ?? null,
            FechaDepreciacion: this.dateAdapter.parse(d.FechaDepreciacion, MY_DATE_FORMATS.parse.dateInput) ?? null,
            FechaDeprecia: this.dateAdapter.parse(d.FechaDeprecia, MY_DATE_FORMATS.parse.dateInput) ?? null,
            FechaIngreso: this.dateAdapter.parse(d.FechaIngreso, MY_DATE_FORMATS.parse.dateInput) ?? null,
            fechaCompraReal: this.dateAdapter.parse(d.FechaCompraReal, MY_DATE_FORMATS.parse.dateInput) ?? null,
            observaciones: d.Observacion ?? '',
            activoIntangible: (d.Intangible ?? 0) === 1,

            Tipcod: d.Tipcod ?? null,
            Destipcod: d.Destipcod ?? '',
            Local: d.Local ?? null,

            Tiempodeprec: d.Tiempodeprec ?? 0,
            TiempodeprecMes: d.TiempodeprecMes ?? 0,
            TiempodeprecDia: d.TiempodeprecDia ?? 0,

            // NIVEL5 IDS
            IdPlanCuentas1: d.IdPlanCuentas1 ?? null,
            IdPlanCuentas2: d.IdPlanCuentas2 ?? null,
            IdPlanCuentas3: d.IdPlanCuentas3 ?? null,
            IdPlanCuentas4: d.IdPlanCuentas4 ?? null,
            IdPlanCuentas5: d.IdPlanCuentas5 ?? null,

            ValorRazonable: d.ValorRazonable ?? null,
            AjusteIncremento: d.AjusteIncremento ?? null,
            VidaUtilTotal: d.VidaUtilTotal ?? null,
            SaldoVidaUtil: d.SaldoVidaUtil ?? null,
            NvaDepresiacionAnual: d.NvaDepresiacionAnual ?? null,

            FechaajusteNiifs: d.FechaajusteNiifs ?? '',
            DepresiacionAnual: d.DepresiacionAnual ?? null,
            DepresiacionMensual: d.DepresiacionMensual ?? null,
            DepreMensual: d.DepreMensual ?? null,
            ValorLibros: d.ValorLibros ?? null,

            // ✅ tasa anual (0.33)
            PorcentajeDepresiacion: d.PorcentajeDepresiacion ?? null,

            DepDeducibleSri: d.DepDeducibleSri ?? null,
            DepNoDeducibleNiifs: d.DepNoDeducibleNiifs ?? null,
            PorcentajeDepreciado: d.PorcentajeDepreciado ?? null,
            DepreAcumulada: d.DepreAcumulada ?? null,

            DebeCuenta1: d.DebeCuenta1 ?? null,
            HaberCuenta1: d.HaberCuenta1 ?? null,
            DebeCuenta2: d.DebeCuenta2 ?? null,
            HaberCuenta2: d.HaberCuenta2 ?? null,
            DebeCuenta3: d.DebeCuenta3 ?? null,
            HaberCuenta3: d.HaberCuenta3 ?? null,

            Debecuenta4: d.Debecuenta4 ?? null,
            Habercuenta4: d.Habercuenta4 ?? null,
            Debecuenta5: d.Debecuenta5 ?? null,
            Habercuenta5: d.Habercuenta5 ?? null,

            HoraIngreso: d.HoraIngreso ?? null,
            PathImagenActivo: d.PathImagenActivo ?? null,

            IdEmpesa: this.usuarioActual?.id_empresa ?? null,
            IdUsuario: this.usuarioActual?.id_usuario ?? null,
            usuario: this.usuarioActual?.nombre_usuario ?? ''
          }, { emitEvent: false });

          this.syncCuentaDesdeIdPlan();
          this.syncEstadoDesdeIdMarca();
          this.syncDepartamentoDesdeId();
          this.syncExtraCuentasDesdeIdNivel5();
          this.recalcularActivos();
        },
        error: () => this.router.navigate(['/cg-3000/activo-fijo'])
      });
  }

  // ============================
  // GUARDAR
  // ============================
  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      const faltantes = this.getCamposObligatoriosFaltantes();
      if (faltantes.length) {
        this.dialog.open(CustomMessageBoxComponent, {
          width: '460px',
          data: {
            title: 'Campos obligatorios',
            message: `Faltan completar:\n• ${faltantes.join('\n• ')}`,
            type: 'warning',
            confirmText: 'Entendido',
            showCancel: false
          }
        });
      }
      return;
    }

    const modo: 'create' | 'update' = this.idActivo ? 'update' : 'create';

    this.confirmarGuardar(modo).subscribe((ok: boolean) => {
      if (!ok) return;

      const payloadApi = this.getPayloadApi();
      this.saving.set(true);

      const req$ = this.idActivo
        ? this.api.update(this.idActivo, payloadApi)
        : this.api.create(payloadApi);

      req$
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '420px',
              data: {
                title: 'Proceso exitoso',
                message: this.idActivo ? 'Activo fijo actualizado.' : 'Activo fijo grabado.',
                type: 'success',
                confirmText: 'Aceptar',
                showCancel: false
              }
            }).afterClosed().subscribe(() => {
              this.router.navigate(['/cg-3000/activo-fijo']);
            });
          },
          error: (err: any) => {
            console.error('Error guardando ActivoFijo:', err);

            const msg =
              err?.error?.message ||
              err?.message ||
              'No se pudo guardar el activo fijo. Verifique la información e intente nuevamente.';

            this.dialog.open(CustomMessageBoxComponent, {
              width: '520px',
              data: {
                title: 'Error',
                message: msg,
                type: 'error',
                confirmText: 'Entendido',
                showCancel: false
              }
            });
          }
        });
    });
  }

  cancelar(): void {
    this.router.navigate(['/cg-3000/activo-fijo']);
  }

  // ============================
  // PAYLOAD
  // ============================
  private getPayloadApi(): ActivoFijoDto {
    const v = this.form.getRawValue();

    const dto: any = {
      CodigoAf: Number(v.codigo ?? 0),
      Codigobarra: v.codigoBarras ?? null,

      IdPlanCuentas: (v.idPlanCuentas != null ? Number(v.idPlanCuentas) : null),
      Descripcion: v.descripcion ?? null,
      Marca: v.marcaTexto ?? null,
      IdMarca: (v.idMarca != null ? Number(v.idMarca) : null),

      Feccompra: this.toDateOnly(v.fechaCompra),

      Vidautil: v.vidaUtil ?? null,
      Model: v.modelo ?? null,
      Serie: v.noSeriePlaca ?? null,

      Valorcompra: v.valorCompra ?? null,
      Valorresidual: v.valorResidual ?? null,

      Comprobante: v.noComprobante ?? null,
      Observacion: v.observaciones ?? null,
      Color: v.color ?? null,
      Ubicacion: v.ubicacion ?? null,
      Custodio: v.custodio ?? null,

      Tiempodeprec: v.Tiempodeprec ?? null,

      IdPlanCuentas1: v.IdPlanCuentas1 != null ? Number(v.IdPlanCuentas1) : null,
      IdPlanCuentas2: v.IdPlanCuentas2 != null ? Number(v.IdPlanCuentas2) : null,
      IdPlanCuentas3: v.IdPlanCuentas3 != null ? Number(v.IdPlanCuentas3) : null,
      IdPlanCuentas4: v.IdPlanCuentas4 != null ? Number(v.IdPlanCuentas4) : null,
      IdPlanCuentas5: v.IdPlanCuentas5 != null ? Number(v.IdPlanCuentas5) : null,

      ValorRazonable: v.ValorRazonable ?? null,
      AjusteIncremento: v.AjusteIncremento ?? null,
      VidaUtilTotal: v.VidaUtilTotal ?? null,
      SaldoVidaUtil: v.SaldoVidaUtil ?? null,
      NvaDepresiacionAnual: v.NvaDepresiacionAnual ?? null,

      PathImagenActivo: v.PathImagenActivo ?? null,
      FechaajusteNiifs: v.FechaajusteNiifs ?? null,

      DepresiacionAnual: v.DepresiacionAnual ?? null,
      ValorLibros: v.ValorLibros ?? null,
      PorcentajeDepresiacion: v.PorcentajeDepresiacion ?? null,

      DepDeducibleSri: v.DepDeducibleSri ?? null,
      DepNoDeducibleNiifs: v.DepNoDeducibleNiifs ?? null,
      PorcentajeDepreciado: v.PorcentajeDepreciado ?? null,
      DepreAcumulada: v.DepreAcumulada ?? null,

      DebeCuenta1: v.DebeCuenta1 ?? null,
      HaberCuenta1: v.HaberCuenta1 ?? null,
      DebeCuenta2: v.DebeCuenta2 ?? null,
      HaberCuenta2: v.HaberCuenta2 ?? null,
      DebeCuenta3: v.DebeCuenta3 ?? null,
      HaberCuenta3: v.HaberCuenta3 ?? null,

      Proveedor: v.proveedor ?? null,
      DepresiacionMensual: v.DepresiacionMensual ?? null,
      ComprobanteDiario: v.comprobanteDiario ?? null,
      DepreMensual: v.DepreMensual ?? null,
      TiempodeprecMes: v.TiempodeprecMes ?? null,
      TiempodeprecDia: v.TiempodeprecDia ?? null,

      ComprobanteRet: v.noComprobanteRet ?? null,
      Poliza: v.numeroPoliza ?? null,

      Debecuenta4: v.Debecuenta4 ?? null,
      Debecuenta5: v.Debecuenta5 ?? null,
      Habercuenta4: v.Habercuenta4 ?? null,
      Habercuenta5: v.Habercuenta5 ?? null,

      Intangible: v.activoIntangible ? 1 : 0,

      FechaDepreciacion: this.toDateOnly(v.FechaDepreciacion),
      FechaDeprecia: this.toDateOnly(v.FechaDeprecia),
      FechaIngreso: this.toDateOnly(v.FechaIngreso),
      HoraIngreso: v.HoraIngreso ?? null,

      IdUsuario: (v.IdUsuario != null ? Number(v.IdUsuario) : null),
      IdEmpresa: (v.IdEmpesa != null ? Number(v.IdEmpesa) : null),
      IdDepartamento: (v.IdDepartamento != null ? Number(v.IdDepartamento) : null),
      FechaCompraReal: this.toDateOnly(v.fechaCompraReal),
    };

    dto.IdEmpesa = dto.IdEmpresa;
    if (!this.idActivo) delete dto.CodigoAf;

    return dto as ActivoFijoDto;
  }

  // ============================
  // HELPERS
  // ============================
  private toDateOnly(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v.substring(0, 10);
    if (v instanceof Date) {
      const yyyy = v.getFullYear();
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const dd = String(v.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }

  private n(v: any, def = 0): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
  }

  private fmt2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // ============================
  // ✅ RECALCULO (CORREGIDO)
  // ============================
  private recalcularActivos(): void {
    const v = this.form.getRawValue();

    const valorCompra = this.n(v.valorCompra, 0);
    const periodos = this.n(v.Tiempodeprec, 0);
    const perMes = this.n(v.TiempodeprecMes, 0);
    const perDia = this.n(v.TiempodeprecDia, 0);

    // Residual (si manejas porcentaje residual)
    const porcentajeResidual = this.n((v as any).PorcentajeResidual, 0);
    let valorResidual = this.n(v.valorResidual, 0);

    if (valorCompra > 0 && porcentajeResidual > 0) {
      valorResidual = (valorCompra * porcentajeResidual) / 100;
    }
    valorResidual = this.fmt2(valorResidual);

    // ✅ TASA ANUAL: tú la ingresas en PorcentajeDepresiacion
    let tasaAnual = this.n(v.PorcentajeDepresiacion, 0);

    // permitir ingresar 33 en lugar de 0.33
    if (tasaAnual > 1) tasaAnual = tasaAnual / 100;

    // Vida útil (años) - ahora decimal
    let vidaUtil = this.n(v.vidaUtil, 0);

    // Regla:
    // - Si hay tasaAnual > 0 => vidaUtil = 1/tasaAnual
    // - Si no hay tasaAnual pero hay vidaUtil > 0 => tasaAnual = 1/vidaUtil
    if (tasaAnual > 0) {
      vidaUtil = 1 / tasaAnual;
    } else if (vidaUtil > 0) {
      tasaAnual = 1 / vidaUtil;
    }

    // Redondeos
    tasaAnual = this.fmt2(tasaAnual); // ej 0.33
    vidaUtil = this.fmt2(vidaUtil);   // ej 3.03

    // Depreciación anual y mensual
    let depreAnual = 0;
    let depreMensual = 0;

    if (valorCompra > 0 && tasaAnual > 0) {
      depreAnual = (valorCompra - valorResidual) * tasaAnual;
      depreMensual = depreAnual / 12;
    }

    depreAnual = this.fmt2(depreAnual);
    depreMensual = this.fmt2(depreMensual);

    // % depreciado (con vidaUtil decimal)
    let porcentajeDepreciado = 0;
    if (vidaUtil > 0) {
      const totalDias = vidaUtil * 365;
      const diasAcum = (periodos * 365) + (perMes * 30) + perDia;
      porcentajeDepreciado = totalDias > 0 ? (diasAcum * 100) / totalDias : 0;
    }
    porcentajeDepreciado = this.fmt2(porcentajeDepreciado);

    // acumulada y valor en libros
    const valorMes = perMes > 0 ? perMes * depreMensual : 0;
    const valorDias = perDia > 0 ? perDia * (depreMensual / 30) : 0;
    const valorAnio = periodos > 0 ? periodos * depreAnual : 0;

    const depreAcumulada = this.fmt2(valorMes + valorDias + valorAnio);
    const valorLibros = this.fmt2(valorCompra - depreAcumulada);

    // NIIF/SRI (igual que tenías)
    const vidaUtilTotal = this.n(v.VidaUtilTotal, 0);
    const valorRazonable = this.n(v.ValorRazonable, 0);

    let saldoVidaUtil = 0;
    let nvaDeprAnual = this.n(v.NvaDepresiacionAnual, 0);
    let depDeducibleSri = this.n(v.DepDeducibleSri, 0);
    let depNoDeducibleNiifs = this.n(v.DepNoDeducibleNiifs, 0);

    if (vidaUtilTotal > 0) {
      saldoVidaUtil = vidaUtilTotal - periodos;
      if (saldoVidaUtil <= 0) saldoVidaUtil = 0;

      if (saldoVidaUtil > 0) {
        nvaDeprAnual = valorRazonable / saldoVidaUtil;
        depDeducibleSri = valorLibros / saldoVidaUtil;
        depNoDeducibleNiifs = nvaDeprAnual - depDeducibleSri;
      } else {
        nvaDeprAnual = depreAnual;
        depDeducibleSri = depreAnual;
        depNoDeducibleNiifs = 0;
      }
    } else {
      saldoVidaUtil = 0;
      if (!nvaDeprAnual) nvaDeprAnual = depreAnual;
      if (!depDeducibleSri) depDeducibleSri = depreAnual;
      if (!depNoDeducibleNiifs) depNoDeducibleNiifs = 0;
    }

    nvaDeprAnual = this.fmt2(nvaDeprAnual);
    depDeducibleSri = this.fmt2(depDeducibleSri);
    depNoDeducibleNiifs = this.fmt2(depNoDeducibleNiifs);

    let ajusteIncremento = 0;
    if (valorRazonable > 0) ajusteIncremento = valorRazonable - valorLibros;
    ajusteIncremento = this.fmt2(ajusteIncremento);

    // ✅ patch final
    this.form.patchValue({
      valorResidual,

      // Estos 2 quedan sincronizados
      PorcentajeDepresiacion: tasaAnual,
      vidaUtil: vidaUtil,

      DepresiacionAnual: depreAnual,
      DepresiacionMensual: depreMensual,
      DepreMensual: depreMensual,

      PorcentajeDepreciado: porcentajeDepreciado,
      DepreAcumulada: depreAcumulada,
      ValorLibros: valorLibros,

      SaldoVidaUtil: saldoVidaUtil,
      NvaDepresiacionAnual: nvaDeprAnual,
      DepDeducibleSri: depDeducibleSri,
      DepNoDeducibleNiifs: depNoDeducibleNiifs,
      AjusteIncremento: ajusteIncremento
    }, { emitEvent: false });
  }

  // ✅ Importante: agregar PorcentajeDepresiacion en el hook
  private hookRecalculos(): void {
    const controls = [
      'valorCompra',
      'valorResidual',
      'vidaUtil',
      'PorcentajeDepresiacion', // 👈 agregado

      'Tiempodeprec',
      'TiempodeprecMes',
      'TiempodeprecDia',

      'ValorRazonable',
      'VidaUtilTotal',
      'FechaDeprecia',
      'fechaCompra'
    ]
      .map(n => this.form.get(n))
      .filter(Boolean);

    if (!controls.length) return;

    merge(...controls.map(c => c!.valueChanges))
      .pipe(
        startWith(null),
        debounceTime(0),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.recalcularActivos());
  }

  confirmarGuardar(modo: 'create' | 'update') {
    const accion = modo === 'update' ? 'actualizar' : 'guardar';

    return this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmación',
        message: `¿Está seguro de ${accion} este activo fijo?`,
        type: 'info',
        confirmText: 'Sí, confirmar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed();
  }

  private getCamposObligatoriosFaltantes(): string[] {
    const labels: Record<string, string> = {
      idPlanCuentas: 'Cuenta Contable',
      descripcion: 'Descripción',
      idMarca: 'Estado',
      IdDepartamento: 'Departamento',
    };

    const faltantes: string[] = [];
    Object.keys(labels).forEach((key) => {
      const ctrl = this.form.get(key);
      if (ctrl?.hasError('required')) faltantes.push(labels[key]);
    });

    return faltantes;
  }

  // (se queda por si la usas en otros campos; ya no se usa en vidaUtil)
  private enteroNoNegativoValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;

    const n = Number(v);
    if (!Number.isFinite(n)) return { integer: true };
    if (n < 0) return { min: true };
    if (!Number.isInteger(n)) return { integer: true };
    return null;
  }

  // =============================
  // Helpers UI (Mayúsculas)
  // =============================
  convertirAMayusculas(controlName: string): void {
    const c = this.form.get(controlName);
    if (!c) return;

    const v = String(c.value ?? '');
    c.setValue(v.toUpperCase(), { emitEvent: false });
  }

  // =============================
  // Imagen: preview unificado (URL o Base64)
  // =============================
  imagenPreview(): string | null {
    const url = String(this.form.get('PathImagenActivo')?.value ?? '').trim();
    if (url) return url;

    const b64 = this.form.get('imagenBase64')?.value;
    if (b64) {
      const mime = this.form.get('imagenMimeType')?.value || 'image/jpeg';
      return `data:${mime};base64,${b64}`;
    }

    return null;
  }

  usarImagenDesdeUrl(): void {
    const url = String(this.form.get('PathImagenActivo')?.value ?? '').trim();
    if (!url) return;

    const ok = /^https?:\/\/.+/i.test(url);
    if (!ok) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '420px',
        data: {
          title: 'URL inválida',
          message: 'Ingrese una URL válida que empiece con http:// o https://',
          type: 'warning',
          confirmText: 'Entendido',
          showCancel: false
        }
      });
      return;
    }

    this.form.patchValue({ imagenBase64: null, imagenMimeType: null }, { emitEvent: false });
  }

  onSeleccionarImagen(file: File | null): void {
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '420px',
        data: {
          title: 'Formato no permitido',
          message: 'Solo se permite PNG, JPG/JPEG o WEBP.',
          type: 'warning',
          confirmText: 'Entendido',
          showCancel: false
        }
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;

      this.form.patchValue(
        {
          PathImagenActivo: null,
          imagenBase64: base64,
          imagenMimeType: file.type
        },
        { emitEvent: false }
      );
    };

    reader.readAsDataURL(file);
  }

  // =============================
  // Normalización numérica
  // =============================
  asegurarNoNegativo(controlName: string): void {
    const c = this.form.get(controlName);
    if (!c) return;

    const raw = c.value;
    if (raw === null || raw === undefined || raw === '') {
      c.setValue(0, { emitEvent: true });
      return;
    }

    const n = Number(raw);
    if (!Number.isFinite(n)) {
      c.setValue(0, { emitEvent: true });
      return;
    }

    if (n < 0) c.setValue(0, { emitEvent: true });
  }

  bloquearNoEnterosNoNegativos(e: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowed.includes(e.key)) return;

    const blocked = ['-', '+', 'e', 'E', '.', ','];
    if (blocked.includes(e.key)) {
      e.preventDefault();
      return;
    }

    if (!/^\d$/.test(e.key)) e.preventDefault();
  }

  normalizarEnteroNoNegativo(controlName: string): void {
    const c = this.form.get(controlName);
    if (!c) return;

    const raw = String(c.value ?? '').trim();
    const cleaned = raw.replace(/[^\d]/g, '');

    if (!cleaned) {
      c.setValue(0, { emitEvent: true });
      return;
    }

    const n = parseInt(cleaned, 10);
    c.setValue(Number.isFinite(n) && n >= 0 ? n : 0, { emitEvent: true });
  }
}
