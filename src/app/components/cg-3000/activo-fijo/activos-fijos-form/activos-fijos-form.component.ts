import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { startWith, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDateFormats } from '@angular/material/core';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

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

import { ActivoFijoApiService, ActivoFijoDto } from 'src/app/services/activos-fijos.service';
import { PlanActivosService, PlanCuentaMiniDto } from 'src/app/services/plan-activos.service';
import { MarcaCgService, MarcaCgDto } from 'src/app/services/marca-cg.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { DepartamentosActivosService, DepartamentoDto } from 'src/app/services/departamentos-activos.service';
import { DestroyRef, inject } from '@angular/core';
import { merge } from 'rxjs';
import { debounceTime} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NativeDateAdapter } from '@angular/material/core';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { MatDialog } from '@angular/material/dialog';

export const MY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'dd/MM/yyyy',
  },
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

    // si ya es Date
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    if (typeof value === 'string') {
      const s = value.trim();

      // ISO con hora: "2020-09-07T05:00:00.000Z" -> yyyy-mm-dd
      if (s.includes('T') && s.length >= 10) {
        const ymd = s.substring(0, 10);
        const [y, m, d] = ymd.split('-').map(Number);
        if (y && m && d) return new Date(y, m - 1, d); // LOCAL
      }

      // DateOnly: "2020-09-07"
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d); // LOCAL
      }

      // "07/09/2022"
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
    MatAutocompleteModule
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

  usuarioActual: any = null;
  private readonly destroyRef = inject(DestroyRef);
  // ============================
  // Plan de cuentas (mini)
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

    // ✅ precarga SIEMPRE para no mandar null
    if (this.usuarioActual) {
      this.form.patchValue(
        {
          IdEmpesa: this.usuarioActual.id_empresa ?? null, // typo backend: IdEmpesa
          IdUsuario: this.usuarioActual.id_usuario ?? null,
          usuario: this.usuarioActual.nombre_usuario ?? ''
        },
        { emitEvent: false }
      );
    }

    // catálogos
    this.cargarCatalogoCuentas();
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
      // ======================
      // TAB 1 (UI actual)
      // ======================
      codigo: [''], // visual (CodigoAf)
      codigoBarras: [''],

      idPlanCuentas: [null, Validators.required],
      cuentaPresentacion: [''],
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

      // ======================
      // TAB 2 (UI actual)
      // ======================
      comprobanteDiario: [''],
      fechaCompra: [null],
      proveedor: [''],
      noComprobante: [''],
      noComprobanteRet: [''],

      valorCompra: [null],
      valorResidual: [0],
      vidaUtil: [null],

      // ======================
      // CAMPOS ADICIONALES (NIIF / SRI / Contables / Depreciación)
      // (Aún no están en tu HTML, pero ya quedan listos)
      // ======================
      Tipcod: [null],
      Destipcod: [''],
      Local: [null],

      Tiempodeprec: [''],
      TiempodeprecMes: [''],
      TiempodeprecDia: [''],

      Ctacontable1: [''],
      Ctacontable2: [''],
      Ctacontable3: [''],
      Ctacontable4: [''],
      Ctacontable5: [''],
      Ctacontable6: [''],
      Ctacontable7: [''],

      ValorRazonable: [null],
      AjusteIncremento: [null],
      VidaUtilTotal: [null],
      SaldoVidaUtil: [null],
      NvaDepresiacionAnual: [null],

      FechaajusteNiifs: [''],
      DepresiacionAnual: [null],
      DepresiacionMensual: [null],  // <- tu ejemplo “depremensual”
      DepreMensual: [null],         // ojo: existen ambas en tu entidad
      ValorLibros: [null],
      PorcentajeDepresiacion: [null],
      DepDeducibleSri: [null],
      DepNoDeducibleNiifs: [null],
      PorcentajeDepreciado: [null],
      DepreAcumulada: [null],

      DebeCuenta1: [null],
      HaberCuenta1: [null],
      DebeCuenta2: [null],
      HaberCuenta2: [null],
      DebeCuenta3: [null],
      HaberCuenta3: [null],

      Debecuenta4: [null],
      Habercuenta4: [null],
      Debecuenta5: [null],
      Habercuenta5: [null],

      FechaDepreciacion: [null], // DateOnly en backend (mándalo como string o Date)
      FechaDeprecia: [null],
      FechaIngreso: [null],
      HoraIngreso: [null],

      PathImagenActivo: [null],

      // ======================
      // BACKEND (swagger)
      // ======================
      IdEmpesa: [null],
      IdUsuario: [null]
    });
  }

  // ==================================
  // PlanCuentas mini
  // ==================================
  private cargarCatalogoCuentas(): void {
    this.planApi.getMiniByPresentacion(this.cuentasActivosFijos).subscribe({
      next: (rows: PlanCuentaMiniDto[]) => {
        this.planMini = rows ?? [];
        const ctrl = this.form.get('cuentaPresentacion');

        this.planMiniFiltered$ = (ctrl?.valueChanges ?? of('')).pipe(
          startWith(ctrl?.value ?? ''),
          map((txt: string) => this.filtrarPlanMini(String(txt ?? '')))
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

  private filtrarPlanMini(txt: string): PlanCuentaMiniDto[] {
    const t = txt.trim().toLowerCase();
    if (!t) return this.planMini.slice();
    return this.planMini.filter(x =>
      (x.CuentaPresentacion ?? '').toLowerCase().includes(t) ||
      (x.NombreCuenta ?? '').toLowerCase().includes(t)
    );
  }

  onCuentaSelected(cuentaPres: string): void {
    const pres = (cuentaPres ?? '').trim();
    const match = this.planMini.find(x => x.CuentaPresentacion === pres);

    if (!match) {
      this.form.patchValue({ idPlanCuentas: null, cuentaNombre: '' });
      return;
    }

    this.form.patchValue({
      idPlanCuentas: match.IdPlanCuentas,
      cuentaPresentacion: match.CuentaPresentacion,
      cuentaNombre: match.NombreCuenta
    });
  }

  onCuentaBlur(): void {
    const pres = String(this.form.get('cuentaPresentacion')?.value ?? '').trim();
    const match = this.planMini.find(x => x.CuentaPresentacion === pres);

    if (!match) {
      this.form.patchValue({ idPlanCuentas: null, cuentaNombre: '' });
    } else {
      this.form.patchValue({ idPlanCuentas: match.IdPlanCuentas, cuentaNombre: match.NombreCuenta });
    }
  }

  private syncCuentaDesdeIdPlan(): void {
    const id = this.form.get('idPlanCuentas')?.value;
    if (!id || !this.planMini?.length) return;

    const match = this.planMini.find(x => x.IdPlanCuentas === Number(id));
    if (!match) return;

    this.form.patchValue(
      { cuentaPresentacion: match.CuentaPresentacion, cuentaNombre: match.NombreCuenta },
      { emitEvent: false }
    );
  }

  // ==================================
  // MarcaCg (estado)
  // ==================================
  private cargarCatalogoMarcas(): void {
    this.marcaApi.getAll().subscribe({
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
      this.form.patchValue({ idMarca: null, estadoNombre: '' });
      return;
    }

    this.form.patchValue({
      idMarca: match.IdMarca,
      estadoNombre: match.Desmar ?? ''
    });
  }

  onEstadoBlur(): void {
    const val = String(this.form.get('estadoNombre')?.value ?? '').trim();
    const match = this.marcas.find(x => (x.Desmar ?? '').trim() === val);

    if (!match) {
      this.form.patchValue({ idMarca: null });
    } else {
      this.form.patchValue({ idMarca: match.IdMarca, estadoNombre: match.Desmar ?? '' });
    }
  }

  private syncEstadoDesdeIdMarca(): void {
    const id = this.form.get('idMarca')?.value;
    if (!id || !this.marcas?.length) return;

    const match = this.marcas.find(x => x.IdMarca === Number(id));
    if (!match) return;

    this.form.patchValue({ estadoNombre: match.Desmar ?? '' }, { emitEvent: false });
  }

  // ==================================
  // Departamentos
  // ==================================
  private cargarCatalogoDepartamentos(): void {
    const idEmpresa = Number(this.usuarioActual?.id_empresa ?? 0);
    if (!idEmpresa) {
      console.warn('No hay id_empresa, no se cargan departamentos.');
      return;
    }

    this.departamentosApi.getAll(idEmpresa).subscribe({
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
      this.form.patchValue({ IdDepartamento: null, departamentoNombre: '' });
      return;
    }

    this.form.patchValue({
      IdDepartamento: dep.IdDepartamento,
      departamentoNombre: dep.Nombre ?? ''
    });
  }

  onDepartamentoBlur(): void {
    const val = String(this.form.get('departamentoNombre')?.value ?? '').trim();
    const match = this.departamentos.find(x => (x.Nombre ?? '').trim() === val);

    if (!match) {
      this.form.patchValue({ IdDepartamento: null });
    } else {
      this.form.patchValue({ IdDepartamento: match.IdDepartamento });
    }
  }

  private syncDepartamentoDesdeId(): void {
    const id = this.form.get('IdDepartamento')?.value;
    if (!id || !this.departamentos?.length) return;

    const match = this.departamentos.find(x => x.IdDepartamento === Number(id));
    if (!match) return;

    this.form.patchValue({ departamentoNombre: match.Nombre ?? '' }, { emitEvent: false });
  }

  // ==================================
  // Load ActivoFijo
  // ==================================
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
            // UI
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
            vidaUtil: d.Vidautil ?? null,
           fechaCompra: this.dateAdapter.parse(d.Feccompra, MY_DATE_FORMATS.parse.dateInput) ?? null,
FechaDepreciacion: this.dateAdapter.parse(d.FechaDepreciacion, MY_DATE_FORMATS.parse.dateInput) ?? null,
FechaDeprecia: this.dateAdapter.parse(d.FechaDeprecia, MY_DATE_FORMATS.parse.dateInput) ?? null,
FechaIngreso: this.dateAdapter.parse(d.FechaIngreso, MY_DATE_FORMATS.parse.dateInput) ?? null,




            observaciones: d.Observacion ?? '',
            activoIntangible: (d.Intangible ?? 0) === 1,

            // ADICIONALES
            Tipcod: d.Tipcod ?? null,
            Destipcod: d.Destipcod ?? '',
            Local: d.Local ?? null,

            Tiempodeprec: d.Tiempodeprec ?? '',
            TiempodeprecMes: d.TiempodeprecMes ?? '',
            TiempodeprecDia: d.TiempodeprecDia ?? '',

            Ctacontable1: d.Ctacontable1 ?? '',
            Ctacontable2: d.Ctacontable2 ?? '',
            Ctacontable3: d.Ctacontable3 ?? '',
            Ctacontable4: d.Ctacontable4 ?? '',
            Ctacontable5: d.Ctacontable5 ?? '',
            Ctacontable6: d.Ctacontable6 ?? '',
            Ctacontable7: d.Ctacontable7 ?? '',

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

            // backend SIEMPRE (para no perderlos)
            IdEmpesa: this.usuarioActual?.id_empresa ?? null,
            IdUsuario: this.usuarioActual?.id_usuario ?? null,
            usuario: this.usuarioActual?.nombre_usuario ?? ''
          }, { emitEvent: false });

          this.syncCuentaDesdeIdPlan();
          this.syncEstadoDesdeIdMarca();
          this.syncDepartamentoDesdeId();
          this.recalcularActivos();
        },
        error: () => this.router.navigate(['/cg-3000/activo-fijo'])
      });
  }

  // ==================================
  // Guardar
  // ==================================


guardar(): void {
  // 1) Validación de obligatorios + mensaje claro
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

  // 2) Determinar modo
  const modo: 'create' | 'update' = this.idActivo ? 'update' : 'create';

  // 3) Confirmación
  this.confirmarGuardar(modo).subscribe((ok: boolean) => {
    if (!ok) return;

    // 4) Payload + request
    const payloadApi = this.getPayloadApi();
    this.saving.set(true);

    const req$ = this.idActivo
      ? this.api.update(this.idActivo, payloadApi)
      : this.api.create(payloadApi);

    req$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (_resp: any) => {
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

  // ==================================
  // Payload API
  // ==================================
  private getPayloadApi(): ActivoFijoDto {
    const v = this.form.getRawValue();

    const dto: any = {
      CodigoAf: Number(v.codigo ?? 0),
      Codigobarra: v.codigoBarras ?? null,

      IdPlanCuentas: (v.idPlanCuentas != null ? Number(v.idPlanCuentas) : null),
      Descripcion: v.descripcion ?? null,
      Marca: v.marcaTexto ?? null,
      IdMarca: (v.idMarca != null ? Number(v.idMarca) : null),

      Feccompra: this.toDateOnly(v.fechaCompra), // o v.Feccompra si ya lo manejas así

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

      Ctacontable1: v.Ctacontable1 ?? null,
      Ctacontable2: v.Ctacontable2 ?? null,
      Ctacontable3: v.Ctacontable3 ?? null,
      Ctacontable4: v.Ctacontable4 ?? null,
      Ctacontable5: v.Ctacontable5 ?? null,
      Ctacontable6: v.Ctacontable6 ?? null,
      Ctacontable7: v.Ctacontable7 ?? null,

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

      FechaDepreciacion:this.toDateOnly(v.FechaDepreciacion) ,
      FechaDeprecia: this.toDateOnly(v.FechaDeprecia),
      FechaIngreso: this.toDateOnly(v.FechaIngreso),
      HoraIngreso: v.HoraIngreso ?? null,

      // ✅ IDs
      IdUsuario: (v.IdUsuario != null ? Number(v.IdUsuario) : null),
      IdEmpresa: (v.IdEmpesa != null ? Number(v.IdEmpesa) : null), // backend entity usa IdEmpresa, swagger usa IdEmpesa en request
      IdDepartamento: (v.IdDepartamento != null ? Number(v.IdDepartamento) : null)
    };

    // ✅ si tu swagger/DTO realmente exige "IdEmpesa" (typo), envíalo también:
    dto.IdEmpesa = dto.IdEmpresa;

    // ✅ nuevo: NO enviar identity
    if (!this.idActivo) delete dto.CodigoAf;

    return dto as ActivoFijoDto;
  }
 
  private fromApiToLocalDate(v: any): Date | null {
  if (!v) return null;

  // si ya es Date
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  if (typeof v === 'string') {
    const s = v.trim();

    // ISO con hora "2020-09-07T05:00:00.000Z" => tomar solo yyyy-mm-dd
    if (s.includes('T') && s.length >= 10) {
      const ymd = s.substring(0, 10);
      const [y, m, d] = ymd.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }

    // DateOnly "2020-09-07"
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    // "07/09/2022"
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

  return null;
}

private toDateOnly(v: any): string | null {
  if (!v) return null;

  // si viene como string ISO "2026-02-05T05:00:00.000Z"
  if (typeof v === 'string') return v.substring(0, 10);

  // si viene como Date (MatDatepicker)
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
  // mantén número; si quieres string formateado, lo haces en el HTML
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Equivalente VB6: PorcentajeDepreciacion(fechaDeprecia - fechaCompra) / 365 */
private porcentajeDepreciacionEntreFechas(fechaDeprecia: any, fechaCompra: any): number {
  if (!fechaDeprecia || !fechaCompra) return 0;

  const f1 = (fechaCompra instanceof Date) ? fechaCompra : new Date(fechaCompra);
  const f2 = (fechaDeprecia instanceof Date) ? fechaDeprecia : new Date(fechaDeprecia);

  if (isNaN(f1.getTime()) || isNaN(f2.getTime())) return 0;

  const diffMs = f2.getTime() - f1.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays / 365;
}

/**
 * ✅ Replica VB6: CalculaValores1()
 * Se ejecuta cuando cambie: valorCompra, vidaUtil, periodos, perMes, perDia,
 * valorRazonable, vidaUtilTotal, fechaDeprecia, fechaCompra.
 */
private recalcularActivos(): void {
  const v = this.form.getRawValue();

  const valorCompra = this.n(v.valorCompra, 0);
  const vidaUtil = this.n(v.vidaUtil, 0);                 // años
  const periodos = this.n(v.Tiempodeprec, 0);             // en VB6 Text1(8) = años depreciados
  const perMes = this.n(v.TiempodeprecMes, 0);
  const perDia = this.n(v.TiempodeprecDia, 0);

  // --- 1) Valor residual (si tu backend te da el porcentaje, úsalo; aquí dejo fallback 0)
  // En VB6 lo lee de Cgparametro codparamt=55. Si NO lo tienes en frontend:
  // - O lo trae backend en el DTO
  // - O crea endpoint parametros/55
  const porcentajeResidual = this.n((v as any).PorcentajeResidual, 0); // opcional
  let valorResidual = this.n(v.valorResidual, 0);

  if (valorCompra > 0 && porcentajeResidual > 0) {
    valorResidual = (valorCompra * porcentajeResidual) / 100;
  }
  valorResidual = this.fmt2(valorResidual);

  // --- 2) % depreciación anual + depre anual + mensual
  let porcentajeDep = 0;
  let depreAnual = 0;
  let depreMensual = 0;

  if (valorCompra > 0 && vidaUtil > 0) {
    porcentajeDep = 1 / vidaUtil;
    depreAnual = (valorCompra - valorResidual) * porcentajeDep;
    depreMensual = depreAnual / 12;
  }

  porcentajeDep = this.fmt2(porcentajeDep);
  depreAnual = this.fmt2(depreAnual);
  depreMensual = this.fmt2(depreMensual);

  // --- 3) % depreciado (Text20 VB6) basado en años/meses/días vs vida útil total
  let porcentajeDepreciado = 0;
  if (vidaUtil > 0) {
    const totalDias = vidaUtil * 365;
    const diasAcum = (periodos * 365) + (perMes * 30) + perDia;
    porcentajeDepreciado = totalDias > 0 ? (diasAcum * 100) / totalDias : 0;
  }
  porcentajeDepreciado = this.fmt2(porcentajeDepreciado);

  // --- 4) Depre acumulada (Text19 VB6) y valor libros
  const valorMes = perMes > 0 ? perMes * depreMensual : 0;
  const valorDias = perDia > 0 ? perDia * (depreMensual / 30) : 0;
  const valorAnio = periodos > 0 ? periodos * depreAnual : 0;

  const depreAcumulada = this.fmt2(valorMes + valorDias + valorAnio);
  const valorLibros = this.fmt2(valorCompra - depreAcumulada);

  // --- 5) NIIF: vida útil total + valor razonable
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
      // VB6: si vidaUtilTotal = 0, usa depreAnual
      nvaDeprAnual = depreAnual;
      depDeducibleSri = depreAnual;
      depNoDeducibleNiifs = 0;
    }
  } else {
    // vidaUtilTotal no aplica
    saldoVidaUtil = 0;
    if (!nvaDeprAnual) nvaDeprAnual = depreAnual;
    if (!depDeducibleSri) depDeducibleSri = depreAnual;
    if (!depNoDeducibleNiifs) depNoDeducibleNiifs = 0;
  }

  nvaDeprAnual = this.fmt2(nvaDeprAnual);
  depDeducibleSri = this.fmt2(depDeducibleSri);
  depNoDeducibleNiifs = this.fmt2(depNoDeducibleNiifs);

  // --- 6) Ajuste incremento: valor razonable - valor libros (VB6 txt_AjusteIncremento)
  let ajusteIncremento = 0;
  if (valorRazonable > 0) {
    ajusteIncremento = valorRazonable - valorLibros;
  }
  ajusteIncremento = this.fmt2(ajusteIncremento);

  // ✅ patch final (sin disparar loops)
  this.form.patchValue(
    {
      valorResidual,
      PorcentajeDepresiacion: porcentajeDep,
      DepresiacionAnual: depreAnual,
      DepresiacionMensual: depreMensual,
      DepreMensual: depreMensual, // en tu entidad existen ambas
      PorcentajeDepreciado: porcentajeDepreciado,
      DepreAcumulada: depreAcumulada,
      ValorLibros: valorLibros,

      SaldoVidaUtil: saldoVidaUtil,
      NvaDepresiacionAnual: nvaDeprAnual,
      DepDeducibleSri: depDeducibleSri,
      DepNoDeducibleNiifs: depNoDeducibleNiifs,

      AjusteIncremento: ajusteIncremento
    },
    { emitEvent: false }
  );
}

private hookRecalculos(): void {
  const controls = [
    'valorCompra',
    'vidaUtil',
    'valorResidual',          // si permites editarlo manualmente
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
      debounceTime(0),                 // evita recalcular 3 veces por un mismo “tick”
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => this.recalcularActivos());
}

convertirAMayusculas(controlName: string): void {
    const control = this.form.get(controlName);
    if (control) {
      const valor = control.value || '';
      control.setValue(valor.toUpperCase());
    }
  }
    convertirAMayusculasUl(controlName: string): void {
    const control = this.form.get(controlName);
    if (control) {
      const valor = control.value || '';
      control.setValue(valor.toUpperCase());
    }
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
  }).afterClosed(); // devuelve Observable<boolean | any>
}
// ✅ Preview unificado: primero URL, luego Base64
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

// ✅ Botón "Cargar desde URL"
usarImagenDesdeUrl(): void {
  const url = String(this.form.get('PathImagenActivo')?.value ?? '').trim();

  if (!url) {
    // opcional: mensaje
    // this.dialog.open(CustomMessageBoxComponent, { ... });
    return;
  }

  // valida formato básico
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

  // si voy a usar URL, limpio Base64 para evitar confusiones
  this.form.patchValue(
    {
      imagenBase64: null,
      imagenMimeType: null
    },
    { emitEvent: false }
  );
}

// ✅ Selección de archivo (Base64)
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

    // si subo archivo, limpio URL para que no “gane”
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


}
