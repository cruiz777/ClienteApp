import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { UsuarioService } from 'src/app/services/usuario.service';
import { EmpresaService, EmpresaComboResponse } from 'src/app/services/empresa.service';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { RpTipEmpService } from 'src/app/services/tipo-empleado.service';
import { TipoNominaEspService } from 'src/app/services/rol/tipo-nomina-esp.service';
import { RpTipEmpResponse } from 'src/app/interfaces/responses/tipo-empleado-response';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { FondosReservaService } from 'src/app/services/rol/fondos-reserva.service';
import { FondosReservaResponse } from 'src/app/interfaces/responses/fondos-reserva-response';
import { FondosReservaRequest, GrabarFondosReservaRequest } from 'src/app/interfaces/requests/fondos-reserva-request';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { FondosReservaExportConfig, FondosReservaExportService } from 'src/app/reports/fondos-reserva-export.service';

@Component({
  selector: 'app-fondo-reserva',
  templateUrl: './fondo-reserva.component.html',
  styleUrls: ['./fondo-reserva.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    {
      provide: MAT_DATE_FORMATS, useValue: {
        parse: { dateInput: 'DD/MM/YYYY' },
        display: {
          dateInput: 'DD/MM/YYYY',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY'
        }
      }
    }
  ]
})
export class FondoReservaComponent implements OnInit {

  // ===== FORMULARIO =====
  form!: FormGroup;
  loading  = false;
  grabando = false;
  datosDesdeDB = false;

  // ===== SESIÓN =====
  usuarioActual: LoginUsuarioResponse | null = null;
  idUsuario!: number;
  idEmpresa!: number;

  // ===== COMBOS =====
  empresas:      EmpresaComboResponse[] = [];
  tiposEmpleado: RpTipEmpResponse[]     = [];
  tiposNomina:   TipoNominaEspResponse[] = [];
  idTipoNomEsp!: number;
  periodoLabel   = '';
  mostrarPeriodo = false;

  // ===== AG GRID =====
  gridApi!: GridApi;
  rowData: FondosReservaResponse[] = [];

  columnDefs: ColDef[] = [
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      pinned: 'left'
    },
    {
      headerName: 'Local',
      field: 'local',
      width: 150,
      pinned: 'left'
    },
    {
      headerName: 'No. Afiliación',
      field: 'numeroAfiliado',
      width: 130
    },
    {
      headerName: 'Cédula',
      field: 'cedula',
      width: 130
    },
    {
      headerName: 'Cód. Sectorial',
      field: 'codigoSectorial',
      width: 130
    },
    {
      headerName: 'Nombre',
      field: 'nombreEmpleado',
      width: 250
    },
    {
      headerName: 'Días',
      field: 'dias',
      width: 90,
      type: 'rightAligned'
    },
    {
      headerName: 'Sueldo Acumulado',
      field: 'sueldoAcumulado',
      width: 150,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Fondo Reserva',
      field: 'valorFR',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Pagado Nómina',
      field: 'pagadoNomina',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Fec. Ingreso',
      field: 'fechaIngreso',
      width: 120,
      valueFormatter: (p: ValueFormatterParams) => this.formatFecha(p.value)
    },
    {
      headerName: 'Fec. Salida',
      field: 'fechaSalida',
      width: 120,
      valueFormatter: (p: ValueFormatterParams) => this.formatFecha(p.value)
    },
    {
      headerName: 'Observación',
      field: 'observacion',
      width: 200
    },
    {
      headerName: 'Descuento',
      field: 'descuento',
      width: 120,
      editable: true,
      type: 'rightAligned',
      cellStyle: { backgroundColor: '#fff9c4' },
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value),
      valueSetter: (params) => {
        const val = parseFloat(params.newValue) || 0;
        if (val < 0) return false;
        params.data.descuento = val;
        params.data.liquidoARecibir = this.calcularLiquido(params.data);
        return true;
      }
    },
    {
      headerName: 'Ret. Judicial',
      field: 'retJudicial',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Líquido a Recibir',
      field: 'liquidoARecibir',
      width: 150,
      type: 'rightAligned',
      cellStyle: { fontWeight: 'bold', color: '#006600' },
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    }
  ];

  defaultColDef: ColDef = {
    sortable:   true,
    filter:     true,
    resizable:  true
  };

  // ===== SUBTOTALES =====
  totalSueldoAcumulado = 0;
  totalValorFR         = 0;
  totalPagadoNomina    = 0;
  totalDescuento       = 0;
  totalRetJudicial     = 0;
  totalLiquido         = 0;

  constructor(
    private fb:               FormBuilder,
    private dialog:           MatDialog,
    private usuarioService:   UsuarioService,
    private empresaService:   EmpresaService,
    private tipEmpService:    RpTipEmpService,
    private tipoNominaService: TipoNominaEspService,
    private fondosService:    FondosReservaService,
    private exportService: FondosReservaExportService
  ) {}

  ngOnInit(): void {
    this.cargarSesion();
    this.inicializarFormulario();
    this.cargarCombos();
  }

  // ===== SESIÓN =====
  private cargarSesion(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    if (!this.usuarioActual) return;
    this.idUsuario = this.usuarioActual.id_usuario;
    this.idEmpresa = this.usuarioActual.id_empresa;
  }

  // ===== FORMULARIO =====
  private inicializarFormulario(): void {
    this.form = this.fb.group({
      idEmpresa:  [null, Validators.required],
      idTipEmp:   [null, Validators.required],
      fechaHasta: [this.ultimoDiaMesActual(), Validators.required]
    });
  }

  // ===== COMBOS =====
  private cargarCombos(): void {
    // Empresas
    this.empresaService.getCombo().subscribe({
      next: (data) => {
        this.empresas = data;
        const emp = this.empresas.find(e => e.idEmpresa === this.idEmpresa);
        if (emp) this.form.patchValue({ idEmpresa: emp.idEmpresa });
      }
    });

    // Tipos de empleado — todos (Fijos, Por Horas, Todos)
    this.tipEmpService.getAll().subscribe({
      next: (resp) => {
        this.tiposEmpleado = resp.data ?? [];
        if (this.tiposEmpleado.length > 0)
          this.form.patchValue({ idTipEmp: this.tiposEmpleado[0].idTipemp });
      }
    });

    // Tipo nómina — autodetectar FR por descripción
    this.tipoNominaService.getAll().subscribe({
      next: (resp) => {
        this.tiposNomina = resp.data ?? [];
        const fr = this.tiposNomina.find(t =>
          t.descripcion?.toUpperCase().includes('RESERVA')
        );
        if (fr) this.idTipoNomEsp = fr.idTipoNomEsp;
      }
    });
  }

  // ===== GRID =====
  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: any): void {
    if (event.colDef.field === 'descuento') {
      this.gridApi.applyTransaction({ update: [event.data] });
      this.calcularSubtotales();
    }
  }

  // ===== CALCULAR =====
  calcular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.idTipoNomEsp) {
      this.showError('No se encontró el tipo de nómina Fondos de Reserva en el catálogo.');
      return;
    }

    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    if (!empresaSeleccionada?.numPatronal) {
      this.showError('La empresa seleccionada no tiene número patronal.');
      return;
    }

    this.calcularPeriodoLabel();
    this.mostrarPeriodo = true;

    const fechaHasta = this.parsearFechaLocal(this.form.value.fechaHasta);
    const periodo    = fechaHasta.getFullYear().toString();

    // Si ya cargué desde DB, recalcula directo sin verificar
    if (this.datosDesdeDB) {
      this.ejecutarCalcular(empresaSeleccionada.numPatronal, fechaHasta);
      return;
    }

    // Verificar si ya existe antes de calcular
    this.fondosService.existe(
      empresaSeleccionada.numPatronal,
      periodo,
      this.idTipoNomEsp
    ).subscribe({
      next: (resp) => {
        if (resp.data) {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '450px',
            data: {
              title: 'Período ya registrado',
              message: `Ya existe información grabada del período ${periodo}. Use el botón "Cargar" para recuperar los datos guardados.`,
              type: 'info',
              confirmText: 'Entendido',
              showCancel: false
            } as MessageBoxData
          });
        } else {
          this.ejecutarCalcular(empresaSeleccionada.numPatronal!, fechaHasta);
        }
      },
      error: () => this.showError('Error al verificar el período.')
    });
  }

  private ejecutarCalcular(numPatronal: string, fechaHasta: Date): void {
    const request: FondosReservaRequest = {
      numPatronal,
      idTipEmp: this.form.value.idTipEmp,
      fechaHasta: this.formatFechaISO(fechaHasta), 
      idTipoNomEsp: this.idTipoNomEsp
    };

    this.loading = true;
    this.fondosService.calcular(request).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR') {
          this.showError(resp.message ?? 'Error al calcular.');
        } else {
          this.rowData = resp.data ?? [];
          this.gridApi?.setGridOption('rowData', this.rowData);
          this.calcularSubtotales();
        }
        this.loading = false;
      },
      error: () => {
        this.showError('Error de conexión al calcular.');
        this.loading = false;
      }
    });
  }

  // ===== GRABAR =====
  grabar(): void {
    if (!this.rowData.length) {
      this.showError('No hay datos para grabar. Calcule primero.');
      return;
    }

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title:       'Confirmar',
        message:     '¿Está seguro que desea grabar la información?',
        type:        'warning',
        confirmText: 'Sí, grabar',
        cancelText:  'Cancelar',
        showCancel:  true
      } as MessageBoxData
    }).afterClosed().subscribe((confirmado: boolean) => {
      if (!confirmado) return;
      this.ejecutarGrabado(false);
    });
  }

  private ejecutarGrabado(forzar: boolean): void {
    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    const fechaHasta = this.parsearFechaLocal(this.form.value.fechaHasta);

    const periodo = fechaHasta.getFullYear().toString();

    const request: GrabarFondosReservaRequest = {
      numPatronal:  empresaSeleccionada!.numPatronal!,
      periodo,
      idTipoNomEsp: this.idTipoNomEsp,
      forzar,
      empleados:    this.rowData, // backend recalcula, envía los datos del grid con descuentos editados
      idUsuario:    this.idUsuario,
      fechaHasta:   this.formatFechaISO(fechaHasta),
      fechaPeriodo: this.formatFechaISO(fechaHasta),
      idTipEmp:     this.form.value.idTipEmp
    };

    this.grabando = true;
    this.fondosService.grabar(request).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR' || resp.type === 'WARNING') {   //agregar WARNING
          const mensaje = resp.message ?? '';
          if (mensaje.toLowerCase().includes('ya existe')) {
            this.grabando = false;
            this.confirmarSobreescritura();
          } else {
            this.showError(mensaje || 'Error al grabar.');
            this.grabando = false;
          }
        } else {
          this.datosDesdeDB = true;
          this.showSuccess('Fondos de reserva grabados correctamente.');
          this.grabando = false;
        }
      },
      error: () => {
        this.showError('Error de conexión al grabar.');
        this.grabando = false;
      }
    });
  }

  private confirmarSobreescritura(): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '450px',
      data: {
        title:       'Nómina Especial',
        message:     '¡Ya existe información del período! ¿Desea eliminar lo almacenado y generar nuevamente?',
        type:        'warning',
        confirmText: 'Sí, reemplazar',
        cancelText:  'No',
        showCancel:  true
      } as MessageBoxData
    }).afterClosed().subscribe((forzar: boolean) => {
      if (!forzar) return;
      this.ejecutarGrabado(true);
    });
  }
  // Metodo que recupera lo ya grabado
  cargar(): void {
    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    if (!empresaSeleccionada?.numPatronal) {
      this.showError('Seleccione una empresa primero.');
      return;
    }

    if (!this.idTipoNomEsp) {
      this.showError('No se encontró el tipo de nómina en el catálogo.');
      return;
    }

    const fechaHasta = this.parsearFechaLocal(this.form.value.fechaHasta);
    const periodo    = fechaHasta.getFullYear().toString();

    this.loading = true;
    this.fondosService.recuperar(
      empresaSeleccionada.numPatronal,
      periodo,
      this.idTipoNomEsp
    ).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR' || resp.type === 'WARNING') {
          this.showError(resp.message ?? 'No existe información grabada para este período.');
        } else {
          this.rowData       = resp.data ?? [];
          this.datosDesdeDB  = true;
          this.mostrarPeriodo = true;
          this.calcularPeriodoLabel();
          this.gridApi?.setGridOption('rowData', this.rowData);
          this.calcularSubtotales();
        }
        this.loading = false;
      },
      error: () => {
        this.showError('Error de conexión al cargar.');
        this.loading = false;
      }
    });
  }
  // ===== CANCELAR =====
  cancelar(): void {
    this.rowData      = [];
    this.datosDesdeDB = false;
    this.mostrarPeriodo = false;
    this.periodoLabel   = '';
    this.gridApi?.setGridOption('rowData', []);
    this.calcularSubtotales();
    this.form.patchValue({ fechaHasta: this.ultimoDiaMesActual() });
  }

  // ===== EXPORTAR =====
  exportar(formato: 'pdf' | 'excel'): void {
    if (!this.rowData.length) {
      this.showError('No hay datos para exportar.');
      return;
    }

    const empresa = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    const config: FondosReservaExportConfig = {
      periodoDesde: this.periodoLabel.split('—')[0].trim(),
      periodoHasta: this.periodoLabel.split('—')[1].trim(),
      periodo:      this.parsearFechaLocal(
                      this.form.value.fechaHasta).getFullYear().toString(),
      empresa:      empresa?.nombre ?? '',
      empleados:    this.rowData
    };

    if (formato === 'pdf') {
      this.exportService.exportarPdfDetalle(config);
      this.exportService.exportarPdfResumen(config);
    } else {
      this.exportService.exportarExcelDetalle(config);
      this.exportService.exportarExcelResumen(config);
    }
  }

  // ===== SUBTOTALES =====
  private calcularSubtotales(): void {
    this.totalSueldoAcumulado = this.rowData.reduce((s, r) => s + (r.sueldoAcumulado ?? 0), 0);
    this.totalValorFR         = this.rowData.reduce((s, r) => s + (r.valorFR         ?? 0), 0);
    this.totalPagadoNomina    = this.rowData.reduce((s, r) => s + (r.pagadoNomina    ?? 0), 0);
    this.totalDescuento       = this.rowData.reduce((s, r) => s + (r.descuento       ?? 0), 0);
    this.totalRetJudicial     = this.rowData.reduce((s, r) => s + (r.retJudicial     ?? 0), 0);
    this.totalLiquido         = this.rowData.reduce((s, r) => s + (r.liquidoARecibir ?? 0), 0);
  }

  private calcularLiquido(row: FondosReservaResponse): number {
    return (row.valorFR ?? 0) - (row.pagadoNomina ?? 0) - (row.descuento ?? 0) - (row.retJudicial ?? 0);
  }

  // ===== HELPERS =====
  private calcularPeriodoLabel(): void {
    const fechaFin = this.parsearFechaLocal(this.form.value.fechaHasta);

    const anio   = fechaFin.getFullYear();
    const inicio = new Date(anio, 0, 1);   //mismo año, sin restar

    this.periodoLabel = `${this.formatFechaDate(inicio)} — ${this.formatFechaDate(fechaFin)}`;
  }

  private ultimoDiaMesActual(): Date {
    const hoy  = new Date();
    // Día 0 del mes siguiente = último día del mes actual
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  }
  formatFecha(value: string | null): string {
    if (!value) return '';
    const [anio, mes, dia] = value.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
  }
  private formatFechaISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes  = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia  = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  private parsearFechaLocal(fechaRaw: any): Date {
    if (typeof fechaRaw?.toDate === 'function')
      return fechaRaw.toDate(); // Moment

    if (typeof fechaRaw === 'string') {
      const [anio, mes, dia] = fechaRaw.split('-').map(Number);
      return new Date(anio, mes - 1, dia); // local sin UTC
    }

    return new Date(fechaRaw);
  }
  private formatFechaDate(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  formatMoneda(value: number): string {
    if (value == null) return '$0.00';
    return '$' + Number(value).toFixed(2);
  }

  private showError(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Error', message,
        type: 'error', confirmText: 'Aceptar', showCancel: false
      } as MessageBoxData
    });
  }

  private showSuccess(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Éxito', message,
        type: 'success', confirmText: 'Aceptar', showCancel: false
      } as MessageBoxData
    });
  }
}