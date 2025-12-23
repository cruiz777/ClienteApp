import { Component, OnInit, Optional } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  CellClickedEvent,
} from 'ag-grid-community';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import {
  AnticipoDetalleRequest,
  CreateAnticipoRequest,
} from 'src/app/interfaces/requests/anticipo-cg-request';
import {
  AnticiposCgService,
  ApiResponse,
} from 'src/app/services/anticipos-cg.service';

// === Servicios / interfaces para cabecera (igual que Asientos) ===
import { UsuarioService } from 'src/app/services/usuario.service';
import { TipoAsientoService } from 'src/app/services/tipoasiento.service';
import { TipoAsientoResponse } from 'src/app/interfaces/responses/tipo-asiento-response';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ZonaService } from 'src/app/services/zona.service';
import { ZonaResponse } from 'src/app/interfaces/responses/zona-response';

import { CodigosContablesService } from 'src/app/services/codigoscontables.service';
import { CodigosContablesResponse } from 'src/app/interfaces/responses/codigos-contables-response';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  map,
  distinctUntilChanged,
  switchMap,
  tap,
  shareReplay,
  catchError,
} from 'rxjs/operators';

// Forma de pago CG
import { FormaPagoCgResponse } from 'src/app/interfaces/responses/formapagocg-response';
import { FormaPagoCgService } from 'src/app/services/forma-pago-cg.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';

// Plan de cuentas (para Cuenta Anticipo)
import {
  PlanCuentasService,
  PlanCuenta,
} from 'src/app/services/plan-cuentas.service';

// ⬇️ Cell editor reutilizado
import { PlanCuentaCellEditorComponent } from './plan-cuenta-cell-editor.component';

@Component({
  selector: 'app-anticipo-cg-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AgGridAngular,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PlanCuentaCellEditorComponent,
    MatSnackBarModule,
  ],
  templateUrl: './anticipos-cg-form.component.html',
  styleUrls: ['./anticipos-cg-form.component.css'],
})
export class AnticipoCgFormComponent implements OnInit {
  formCabecera!: FormGroup;

  tiposAsiento$!: Observable<TipoAsientoResponse[]>;
  zonas$!: Observable<ZonaResponse[]>;
  beneficiariosFiltrados$!: Observable<CodigosContablesResponse[]>;
  formasPago$!: Observable<FormaPagoCgResponse[]>;
  cuentasAnticipo$!: Observable<PlanCuenta[]>;

  private tipoAsientos: Array<{ id: number; nombre: string; tipDoc: string }> =
    [];
  private cuentasAnticipo: PlanCuenta[] = [];

  cuentasBanco: { id: number; label: string; codigo: string }[] = [];

  usuarioActual = this.usuarioService.getUsuarioActual();
  idEmpresaActual = this.usuarioActual?.id_empresa ?? 0;
  idUsuarioActual = this.usuarioActual?.id_usuario ?? 0;
  moduloAnticipos = 3;

  busquedaCodBanco = new FormControl<string | CodigosContablesResponse>('');
  codigosBancoFiltrados$!: Observable<CodigosContablesResponse[]>;

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,
    filter: false,
  };

  rowData: AnticipoDetalleRequest[] = [];
  private gridApi!: GridApi<AnticipoDetalleRequest>;

  totalAnticipo = 0;

  idCodContableBancoSeleccionado = 0;
  beneficiarioBancoTexto = '';

  constructor(
    private fb: FormBuilder,
    private anticiposService: AnticiposCgService,
    private usuarioService: UsuarioService,
    private tipoAsientoService: TipoAsientoService,
    private zonaService: ZonaService,
    private codigosContablesService: CodigosContablesService,
    private formaPagoCgService: FormaPagoCgService,
    private planCuentasService: PlanCuentasService,
    private snack: MatSnackBar, // ✅ AQUI
    private router: Router,
    @Optional() private dialogRef: MatDialogRef<AnticipoCgFormComponent> | null
  ) {}

  private getIdCodContable(x: any): number {
    return Number(
      x?.IdCodContable ??
        x?.idCodContable ??
        x?.IdCodigoContable ??
        x?.idCodigoContable ??
        x?.IdCodigosContables ??
        x?.idCodigosContables ??
        0
    );
  }

  ngOnInit(): void {
    this.initForm();
    this.initGridColumns();

    this.cargarZonasPorEmpresa();
    this.cargarTiposAsiento();
    this.cargarFormasPagoCg();
    this.cargarCuentasAnticipo();
    this.bindTipoAsientoToTipDoc();
    this.initAutocompleteBeneficiario();
    this.initAutocompleteCodBanco();

    this.formCabecera
      .get('tipdoc')
      ?.valueChanges.subscribe((v: string | null) => {
        if (!v) return;
        const up = v.toUpperCase();
        if (v !== up) {
          this.formCabecera.get('tipdoc')?.setValue(up, { emitEvent: false });
        }
      });
  }

  private initForm(): void {
    const ahora = new Date();

    this.formCabecera = this.fb.group({
      idZona: [null, Validators.required],
      idTipoAsiento: [null, Validators.required],
      tipdoc: ['', Validators.required],

      // date-only en input
      fechatransaccion: [this.formatDateOnly(ahora), Validators.required],

      // datetime-local en input
      fechaingreso: [this.formatDateTimeLocal(ahora), Validators.required],

      beneficiario: ['', Validators.required],
      concepto: ['', Validators.required],
      idPlanCtasAnticipo: [null, Validators.required],

      idCodContableAnticipo: [0, Validators.required],

      idFormaPagoCg: [null, Validators.required],
    });
  }

  private cargarZonasPorEmpresa(): void {
    const empresaId = this.idEmpresaActual;

    this.zonas$ = this.zonaService.getAll().pipe(
      map((list) => (list || []).filter((z) => z.empresaCodigo === empresaId)),
      shareReplay(1)
    );
  }

  private cargarTiposAsiento(): void {
    this.tiposAsiento$ = this.tipoAsientoService.ListadoAsiento().pipe(
      tap((list) => {
        this.tipoAsientos = (list ?? []).map((r: any) => ({
          id: r.IdTipoAsiento ?? r[' IdTipoAsiento'],
          nombre: (r.Descripcion ?? r.TipAsiento ?? '').toString().trim(),
          tipDoc: (r.TipAsiento ?? r.CodigoDoc ?? '')
            .toString()
            .trim()
            .toUpperCase(),
        }));
        this.setDefaultTipoAsientoEG();
      }),
      shareReplay(1)
    );
  }

  private setDefaultTipoAsientoEG(): void {
    if (!this.formCabecera) return;
    if (!this.tipoAsientos || this.tipoAsientos.length === 0) return;

    const eg = this.tipoAsientos.find((x) => x.tipDoc === 'EG');
    if (!eg) return;

    this.formCabecera.patchValue(
      {
        idTipoAsiento: eg.id,
        tipdoc: eg.tipDoc.slice(0, 2),
      },
      { emitEvent: false }
    );
  }

  private cargarFormasPagoCg(): void {
    const empresaId = this.idEmpresaActual;

    this.formasPago$ = this.formaPagoCgService
      .getAll({ idEmpresa: empresaId })
      .pipe(shareReplay(1));
  }

  private cargarCuentasAnticipo(): void {
    const empresaId = this.idEmpresaActual;

    this.cuentasAnticipo$ = this.planCuentasService
      .getAll({ idEmpresa: empresaId })
      .pipe(
        map((list) => (list || []).filter((c) => c.EsMovimiento)),
        map((movList) => {
          const bancoList = movList.filter(
            (c) => this.getIdCodigoEspecial(c) === 4
          );

          this.cuentasBanco = bancoList.map((c) => ({
            id: c.IdPlanCuentas,
            label: `${c.CuentaPresentacion} - ${c.NombreCuenta}`,
            codigo: c.CuentaPresentacion,
          }));

          const anticipoList = movList.filter(
            (c) => this.getIdCodigoEspecial(c) === 14
          );

          this.cuentasAnticipo = anticipoList;
          return anticipoList;
        }),
        shareReplay(1)
      );
  }

  private bindTipoAsientoToTipDoc(): void {
    this.formCabecera
      .get('idTipoAsiento')
      ?.valueChanges.subscribe((id: number | null) => {
        const ta = this.tipoAsientos.find((x) => x.id === Number(id));
        const tipDoc = (ta?.tipDoc ?? '').slice(0, 2);
        this.formCabecera.get('tipdoc')?.setValue(tipDoc, {
          emitEvent: false,
        });
      });
  }

  private initAutocompleteBeneficiario(): void {
    const ctrl = this.formCabecera.get('beneficiario');
    if (!ctrl) return;

    this.beneficiariosFiltrados$ = ctrl.valueChanges.pipe(
      debounceTime(300),
      map((value: any) => (typeof value === 'string' ? value : '')),
      distinctUntilChanged(),
      switchMap((term: string) => {
        const empresaId = this.idEmpresaActual;
        if (!empresaId) return of([]);

        const texto = term.trim();
        if (texto.length < 2) return of([]);

        return this.codigosContablesService
          .buscar(texto, { idEmpresa: empresaId, maxResults: 20 })
          .pipe(
            map((r) => r.data ?? []),
            catchError(() => of([]))
          );
      })
    );
  }

  formatearBeneficiario(c: CodigosContablesResponse): string {
    return `${c.Identificacionauxiliar} - ${c.Razonsocial}`.trim();
  }

  onBeneficiarioSelected(c: CodigosContablesResponse): void {
    if (!c) return;

    const razon = (c.Razonsocial ?? '').toString().trim();
    const idCod = this.getIdCodContable(c);

    this.formCabecera.get('beneficiario')?.setValue(razon, {
      emitEvent: false,
    });

    this.formCabecera.get('idCodContableAnticipo')?.setValue(idCod, {
      emitEvent: false,
    });
  }

  private initAutocompleteCodBanco(): void {
    const ctrl = this.busquedaCodBanco;
    if (!ctrl) return;

    this.codigosBancoFiltrados$ = ctrl.valueChanges.pipe(
      debounceTime(300),
      map((value: any) => (typeof value === 'string' ? value : '')),
      distinctUntilChanged(),
      switchMap((term: string) => {
        const empresaId = this.idEmpresaActual;
        if (!empresaId) return of([]);

        const texto = term.trim();
        if (texto.length < 2) return of([]);

        return this.codigosContablesService
          .buscar(texto, { idEmpresa: empresaId, maxResults: 20 })
          .pipe(
            map((r) => r.data ?? []),
            catchError(() => of([]))
          );
      })
    );
  }

  onCodBancoSelected(c: CodigosContablesResponse): void {
    if (!c) return;

    const texto = `${c.Identificacionauxiliar} - ${c.Razonsocial}`.trim();
    const idCod = this.getIdCodContable(c);

    this.busquedaCodBanco.setValue(texto, { emitEvent: false });

    this.idCodContableBancoSeleccionado = idCod;
    this.beneficiarioBancoTexto = texto;

    if (this.rowData.length === 1) {
      this.rowData[0].idCodContable = idCod;
      this.rowData[0].beneficiario = texto;

      this.rowData = [...this.rowData];
      this.gridApi?.setGridOption('rowData', this.rowData);
    }
  }

  private initGridColumns(): void {
    this.columnDefs = [
      { headerName: 'No', field: 'numlinea', width: 80, editable: false },
      { headerName: 'Local', field: 'idLocal', width: 100 },
      {
        headerName: 'Cuenta Contable (Banco)',
        field: 'idPlanCuentas',
        width: 580,
        editable: true,
        singleClickEdit: true,
        cellEditor: PlanCuentaCellEditorComponent,
        cellEditorPopup: true,
        cellEditorParams: () => ({
          cuentas: this.cuentasBanco,
        }),
        valueFormatter: (params) => {
          const v = params.value;
          if (v === null || v === undefined || v === '' || Number(v) === 0) {
            return 'Seleccione...';
          }
          const id = Number(v);
          const cta = this.cuentasBanco.find((c) => c.id === id);
          return cta ? cta.label : String(v);
        },
      },
      { headerName: 'Cheque', field: 'cheque', width: 150, valueParser: this.numberParser },
      { headerName: 'Valor', field: 'haber', width: 120, valueParser: this.numberParser },
      { headerName: 'Acción', colId: 'accion', width: 90, editable: false, cellRenderer: () => '🗑️' },
    ];
  }

  onGridReady(event: GridReadyEvent<AnticipoDetalleRequest>): void {
    this.gridApi = event.api;
    this.gridApi.setGridOption('rowData', this.rowData);
  }

  onCellValueChanged(event: CellValueChangedEvent<AnticipoDetalleRequest>): void {
    const rowIndex = event.rowIndex;
    const field = event.colDef.field as keyof AnticipoDetalleRequest | undefined;

    if (field && rowIndex != null && rowIndex >= 0) {
      const row = this.rowData[rowIndex];
      // @ts-ignore
      row[field] = event.newValue;

      if (field === 'idPlanCuentas') {
        const id = Number(event.newValue ?? 0);
        const cta = this.cuentasBanco.find((c) => c.id === id);

        if (cta) {
          row.idPlanCuentas = cta.id;
          row.codprePc = cta.codigo;
        } else {
          row.idPlanCuentas = 0;
          row.codprePc = null;
        }

        this.gridApi?.refreshCells({
          rowNodes: [event.node],
          columns: ['idPlanCuentas'],
          force: true,
        });
      }

      if (field === 'haber' || field === 'cheque') {
        const num = this.toNumber(event.newValue);
        // @ts-ignore
        row[field] = num;
      }

      this.rowData = [...this.rowData];
      this.recalcularTotales();
    }
  }

  onCellClicked(event: CellClickedEvent<AnticipoDetalleRequest>): void {
    const colId = event.column.getColId();
    if (colId === 'accion') {
      const idx = event.rowIndex ?? -1;
      if (idx >= 0) {
        this.rowData.splice(idx, 1);
        this.rowData = [...this.rowData];
        this.gridApi?.setGridOption('rowData', this.rowData);
        this.recalcularTotales();
      }
    }
  }

  agregarLinea(): void {
    if (this.formCabecera.invalid) {
      //alert('Complete la cabecera antes de agregar la línea del banco.');
      this.snack.open(
              'Complete la cabecera antes de agregar la línea del banco.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );

      return;
    }

    if (!this.idCodContableBancoSeleccionado || this.idCodContableBancoSeleccionado <= 0) {
      //alert('Seleccione el Beneficiario (Banco) antes de agregar la línea.');
       this.snack.open(
              'Seleccione el Beneficiario (Banco) antes de agregar la línea.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    if (this.rowData.length >= 1) {
      //alert('Solo se permite una línea de banco para el anticipo.');
      this.snack.open(
              'Solo se permite una línea de banco para el anticipo.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    const cab = this.formCabecera.value;

    // ✅ FECHA TRANSACCION: UTC midnight (00:00:00Z)
    const fechaTran = this.toUtcMidnightDateOnly(cab.fechatransaccion);
    const fechaIng = new Date(cab.fechaingreso);

    const nuevaLineaBanco: AnticipoDetalleRequest = {
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea: 2,
      anio: fechaTran.getUTCFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      hora: this.buildHoraFromDate(fechaIng),
      idZona: cab.idZona,
      idLocal: 1,
      idPlanCuentas: 0,
      codprePc: null,
      idCodContable: this.idCodContableBancoSeleccionado,
      nocomprobante: null,
      cheque: null,
      beneficiario: this.beneficiarioBancoTexto || cab.beneficiario,
      debe: null,
      haber: 0,
      comentario: cab.concepto,
      idMovBancario: null,
      movbancario: '1',
    };

    this.rowData = [nuevaLineaBanco];
    this.gridApi?.setGridOption('rowData', this.rowData);
    this.recalcularTotales();
  }

  private recalcularTotales(): void {
    this.totalAnticipo = this.rowData.reduce((acc, r) => acc + (r.haber ?? 0), 0);
  }

  guardar(): void {
    if (this.formCabecera.invalid) {
      //alert('Complete todos los campos obligatorios de la cabecera.');
       this.snack.open(
              'Complete todos los campos obligatorios de la cabecera.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    if (this.rowData.length !== 1) {
      //alert('Debe ingresar exactamente una línea de banco en el detalle.');
      this.snack.open(
              'Debe ingresar exactamente una línea de banco en el detalle.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    this.recalcularTotales();

    if (this.totalAnticipo <= 0) {
      //alert('Ingrese el valor del anticipo en la columna "Valor" de la línea de banco.');
      this.snack.open(
              'Ingrese el valor del anticipo en la columna "Valor" de la línea de banco.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    const cab = this.formCabecera.value;

    const idCodProveedor = Number(cab.idCodContableAnticipo ?? 0);
    if (idCodProveedor <= 0) {
      //alert('El Proveedor no tiene IdCodContable válido (está en 0). Selecciónelo del autocomplete.');
       this.snack.open(
              'El Proveedor no tiene IdCodContable válido (está en 0). Selecciónelo del autocomplete.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    if (this.idCodContableBancoSeleccionado <= 0) {
      //alert('El Beneficiario (Banco) no tiene IdCodContable válido (está en 0). Selecciónelo.');
      this.snack.open(
              'El Beneficiario (Banco) no tiene IdCodContable válido (está en 0). Selecciónelo.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    const idFormaPago = Number(cab.idFormaPagoCg ?? 0);
    if (idFormaPago <= 0) {
      //alert('Seleccione la Forma de Pago.');
       this.snack.open(
              'Seleccione la Forma de Pago.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    // ✅ FECHA TRANSACCION: UTC midnight (00:00:00Z)
    const fechaTran = this.toUtcMidnightDateOnly(cab.fechatransaccion);
    const fechaIng = new Date(cab.fechaingreso);

    const cuentaPlan = this.cuentasAnticipo.find(
      (c) => c.IdPlanCuentas === cab.idPlanCtasAnticipo
    );
    const cuentaCodigo =
      cuentaPlan?.CuentaPresentacion || (cuentaPlan as any)?.CodigoCompleto || '';

    const lineaAnticipo: AnticipoDetalleRequest = {
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea: 1,
      anio: fechaTran.getUTCFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      hora: this.buildHoraFromDate(fechaIng),
      idZona: cab.idZona,
      idLocal: 1,
      idPlanCuentas: cab.idPlanCtasAnticipo,
      codprePc: cuentaCodigo,
      idCodContable: idCodProveedor,
      nocomprobante: null,
      cheque: 0,
      beneficiario: cab.beneficiario,
      debe: this.totalAnticipo,
      haber: 0,
      comentario: cab.concepto,
      idMovBancario: 1,
      movbancario: '0',
    };

    const bancoRow = this.rowData[0];
    const idPlanBanco = Number(bancoRow.idPlanCuentas ?? 0);
    if (idPlanBanco <= 0) {
      //alert('Seleccione la Cuenta Contable (Banco) en la línea del detalle.');
      this.snack.open(
              'Seleccione la Cuenta Contable (Banco) en la línea del detalle.',
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
              }
            );
      return;
    }

    const cuentaBanco = this.cuentasBanco.find((c) => c.id === idPlanBanco);
    const codigoBanco = cuentaBanco?.codigo ?? bancoRow.codprePc ?? '';

    const lineaBanco: AnticipoDetalleRequest = {
      IdDetMaestro: 0,
      IdCabMaestro: 0,
      numlinea: 2,
      anio: fechaTran.getUTCFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      hora: this.buildHoraFromDate(fechaIng),
      idZona: cab.idZona,
      idLocal: 1,
      idPlanCuentas: idPlanBanco,
      codprePc: codigoBanco,
      cheque: bancoRow.cheque ?? 0,
      idCodContable: this.idCodContableBancoSeleccionado,
      nocomprobante: null,
      beneficiario: this.beneficiarioBancoTexto || cab.beneficiario,
      debe: 0,
      haber: this.totalAnticipo,
      comentario: cab.concepto,
      idMovBancario: 2,
      movbancario: 'CH',
    };

    const request: CreateAnticipoRequest = {
      IdCabMaestro: 0,
      idZona: cab.idZona,
      idUsuario: this.idUsuarioActual,
      idEmpresa: this.idEmpresaActual,
      idTipoAsiento: cab.idTipoAsiento,
      tipdoc: cab.tipdoc,
      numdoc: 0,
      anio: fechaTran.getUTCFullYear().toString(),
      fechatransaccion: fechaTran,
      fechaingreso: fechaIng,
      observacion: cab.concepto,
      totdebe: this.totalAnticipo,
      tothaber: this.totalAnticipo,
      beneficiario: cab.beneficiario,
      modulo: this.moduloAnticipos,
      id_forma_pago_cg: idFormaPago,
      detalles: [lineaAnticipo, lineaBanco],
    };

    this.anticiposService.crearAnticipo(request).subscribe({
      next: (resp: ApiResponse<number>) => {
        if (resp.type === 'CREATED') {
          //alert(`Anticipo creado correctamente. Id Cabecera: ${resp.data}`);
           this.snack.open(
            `Anticipo creado correctamente. Id Cabecera: ${resp.data}`,
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
          this.resetFormulario();
        } else {
          //alert(`Respuesta del servidor: ${resp.message || resp.type}`);
           this.snack.open(
            `Respuesta del servidor: ${resp.message || resp.type}`,
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
            }
          );
        }
      },
      error: (err) => {
        //console.error('Error al crear anticipo', err);
        //console.error('Backend says:', err?.error);
        //alert(err?.error?.message || 'Ocurrió un error al crear el anticipo.');
        console.error('Error al crear anticipo', err);
        console.error('Backend says:', err?.error);

        this.snack.open(
          err?.error?.message || 'Ocurrió un error al crear el anticipo.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          }
        );
      },
    });
  }

  cancelar(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/cg-3000/inicio-cg']);
    }
  }

  private resetFormulario(): void {
    const ahora = new Date();
    this.formCabecera.reset({
      idZona: null,
      idTipoAsiento: null,
      tipdoc: '',
      fechatransaccion: this.formatDateOnly(ahora),
      fechaingreso: this.formatDateTimeLocal(ahora),
      idPlanCtasAnticipo: null,
      idCodContableAnticipo: 0,
      idFormaPagoCg: null,
      beneficiario: '',
      concepto: '',
    });

    this.idCodContableBancoSeleccionado = 0;
    this.beneficiarioBancoTexto = '';
    this.busquedaCodBanco.setValue('', { emitEvent: false });

    this.setDefaultTipoAsientoEG();

    this.rowData = [];
    this.gridApi?.setGridOption('rowData', this.rowData);
    this.totalAnticipo = 0;
  }

  private numberParser = (params: any): number | null => {
    const value = params.newValue ?? params.value;
    return this.toNumber(value);
  };

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private buildHoraFromDate(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private formatDateOnly(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private formatDateTimeLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  private getIdCodigoEspecial(c: any): number {
    return Number(c?.IdCodigoEspecial ?? c?.idCodigoEspecial ?? 0);
  }

  // ✅ CLAVE: convierte date-only a "UTC midnight"
  private toUtcMidnightDateOnly(value: any): Date {
    // value viene del input type="date": "YYYY-MM-DD"
    const s = (value ?? '').toString().trim();
    if (!s) return new Date(NaN);

    // Si ya viene como YYYY-MM-DD, usamos Z directo (queda EXACTO "YYYY-MM-DDT00:00:00.000Z")
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T00:00:00.000Z`);
    }

    // fallback para Date u otros formatos
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }
}

