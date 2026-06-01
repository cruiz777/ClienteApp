import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { UsuarioService } from 'src/app/services/usuario.service';
import { EmpresaService, EmpresaComboResponse } from 'src/app/services/empresa.service';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { DecimosEmpleadoResponse } from 'src/app/interfaces/responses/decimos-response';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { RpTipEmpService } from 'src/app/services/tipo-empleado.service';
import { TipoNominaEspService } from 'src/app/services/rol/tipo-nomina-esp.service';
import { DecimosService } from 'src/app/services/rol/decimos.service';
import { RpTipEmpResponse } from 'src/app/interfaces/responses/tipo-empleado-response';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { RpRegimenService } from 'src/app/services/rol/regimen.service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DecimosExportConfig, DecimosExportService } from 'src/app/reports/decimos-export.service';
import { PeriodosNominaDialogComponent, PeriodosNominaDialogData, PeriodosNominaDialogResult } from '../dialogs/periodos-nomina-dialog.component';
import { GenerarArchivoPichinchaRequest } from 'src/app/interfaces/requests/generar-archivo-request';

@Component({
  selector: 'app-decimo-cuarto',
  templateUrl: './decimo-cuarto.component.html',
  styleUrls: ['./decimo-cuarto.component.css'],
  providers: [
      { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
      {
        provide: DateAdapter,
        useClass: MomentDateAdapter,
        deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
      },
      { provide: MAT_DATE_FORMATS, useValue: {
        parse: { dateInput: 'DD/MM/YYYY' },
        display: {
          dateInput: 'DD/MM/YYYY',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY'
        }
      }}
    ]
})
export class DecimoCuartoComponent implements OnInit {

  // ===== FORMULARIO =====
  form!: FormGroup;
  loading = false;
  grabando = false;
  periodoLabel = '';
  mostrarPeriodo = false; 
  // ===== SESIÓN =====
  usuarioActual: LoginUsuarioResponse | null = null;
  idUsuario!: number;
  idEmpresa!: number;
  datosDesdeDB = false;
  // ===== COMBOS =====
  empresas: EmpresaComboResponse[] = [];
  tiposEmpleado: RpTipEmpResponse[] = [];
  tiposNomina: TipoNominaEspResponse[] = [];
  idTipoNomEsp!: number; // se autodetecta por nombre
  regimenes: RpRegimenResponse[] = [];

  // ===== AG GRID =====
  gridApi!: GridApi;
  rowData: DecimosEmpleadoResponse[] = [];

  columnDefs: ColDef[] = [
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { headerName: 'Local', field: 'local', width: 150, pinned: 'left' },
    { headerName: 'No. Afiliación', field: 'numeroAfiliado', width: 130 },
    { headerName: 'Cédula', field: 'cedula', width: 130 },
    { headerName: 'Cód. Sectorial', field: 'codigoSectorial', width: 130 },
    { headerName: 'Nombre', field: 'nombreEmpleado', width: 250 },
    { headerName: 'Días', field: 'dias', width: 90, type: 'rightAligned' },
    {
      headerName: 'Décimo Tercero',
      field: 'valorDecimo',
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
    { headerName: 'Observación', field: 'observaciones', width: 200 },
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
    sortable: true,
    filter: true,
    resizable: true
  };

  // ===== SUBTOTALES =====
  totalValorDecimo = 0;
  totalDescuento   = 0;
  totalRetJudicial = 0;
  totalLiquido     = 0;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private usuarioService: UsuarioService,
    private empresaService: EmpresaService,
    private regimenService: RpRegimenService,
    private tipEmpService: RpTipEmpService,
    private tipoNominaService: TipoNominaEspService,
    private decimosService: DecimosService,
    private exportService: DecimosExportService

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
      idEmpresa:   [null, Validators.required],
      idTipEmp:    [null, Validators.required],
      fechaHasta:  [new Date(), Validators.required],
      idRegimen: [null, Validators.required]
    });
  }
  formatFecha(value: string | null): string {
    if (!value) return '';
    // Forzar parseo como fecha local sin conversión de timezone
    const [anio, mes, dia] = value.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
  }
  // ===== COMBOS =====
  private cargarCombos(): void {
    // Empresas
    this.empresaService.getCombo().subscribe({
      next: (data) => {
        this.empresas = data;
        // Preseleccionar la empresa del usuario logueado
        const emp = this.empresas.find(e => e.idEmpresa === this.idEmpresa);
        if (emp) this.form.patchValue({ idEmpresa: emp.idEmpresa });
      }
    });
    
    // Tipos de empleado solo escoge fijos 
    this.tipEmpService.getAll().subscribe({
      next: (resp) => {
        this.tiposEmpleado = (resp.data ?? []).filter(t =>
          t.desTipemp.toUpperCase().includes('FIJO')
        );
        if (this.tiposEmpleado.length > 0)
          this.form.patchValue({ idTipEmp: this.tiposEmpleado[0].idTipemp });
      }
    });

    // Tipo nómina — autodetectar D13 por descripción
    this.tipoNominaService.getAll().subscribe({
      next: (resp) => {
        this.tiposNomina = resp.data ?? [];
        const d14 = this.tiposNomina.find(t =>
          t.descripcion?.toUpperCase().includes('DECIMO CUART')
        );
        if (d14) this.idTipoNomEsp = d14.idTipoNomEsp;
      }
    });
    this.regimenService.getAll().subscribe({
      next: (resp) => this.regimenes = resp.data ?? []
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
      this.showError('No se encontró el tipo de nómina en el catálogo.');
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
    const fechaHastaRaw = this.form.value.fechaHasta;
    const fechaHasta    = typeof fechaHastaRaw?.toDate === 'function'
                          ? fechaHastaRaw.toDate()
                          : new Date(fechaHastaRaw);
    const periodo       = fechaHasta.getFullYear().toString();
    // Si ya cargué desde DB, recalcula directo sin verificar
    if (this.datosDesdeDB) {
      this.ejecutarCalcular(empresaSeleccionada.numPatronal!, fechaHasta);
      return;
    }
    // 1. Verificar si ya existe
    this.decimosService.existe(
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

  private ejecutarRecuperar(numPatronal: string, periodo: string): void {
    this.loading = true;
    this.decimosService.recuperar(numPatronal, periodo, this.idTipoNomEsp).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR') {
          this.showError(resp.message ?? 'Error al recuperar.');
        } else {
          this.rowData = resp.data ?? [];
          this.gridApi?.setGridOption('rowData', this.rowData);
          this.calcularSubtotales();
        }
        this.loading = false;
      },
      error: () => {
        this.showError('Error de conexión al recuperar.');
        this.loading = false;
      }
    });
  }

  private ejecutarCalcular(numPatronal: string, fechaHasta: Date): void {
    const request: any = {
      numPatronal,
      idTipEmp: this.form.value.idTipEmp,
      fechaHasta: fechaHasta.toISOString().split('T')[0].split('T')[0],
      idTipoNomEsp: this.idTipoNomEsp
    };

    // Solo D14 envía idRegimen
    if (this.form.value.idRegimen)
      request.idRegimen = this.form.value.idRegimen;

    this.loading = true;
    this.decimosService.calcular(request).subscribe({
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
      this.showError('No hay datos para grabar.');
      return;
    }

    // Confirmación antes de grabar
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Confirmar',
        message: '¿Está seguro que desea grabar la información?',
        type: 'warning',
        confirmText: 'Sí, grabar',
        cancelText: 'Cancelar',
        showCancel: true
      } as MessageBoxData
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      const empresaSeleccionada = this.empresas.find(
        e => e.idEmpresa === this.form.value.idEmpresa
      );
      const fechaHastaRaw = this.form.value.fechaHasta;
      const fechaHasta    = typeof fechaHastaRaw?.toDate === 'function'
                            ? fechaHastaRaw.toDate()
                            : new Date(fechaHastaRaw);

      const periodo = new Date(this.form.value.fechaHasta).getFullYear().toString();

      this.decimosService.existe(
        empresaSeleccionada!.numPatronal!,
        periodo,
        this.idTipoNomEsp
      ).subscribe({
        next: (resp) => {
          if (resp.data) {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '450px',
              data: {
                title: 'Nómina Especial',
                message: '¡Ya existe información del período! ¿Desea eliminar lo almacenado y generar nuevamente?',
                type: 'warning',
                confirmText: 'Sí, reemplazar',
                cancelText: 'No',
                showCancel: true
              } as MessageBoxData
            }).afterClosed().subscribe(forzar => {
              if (forzar)
                this.ejecutarGrabado(empresaSeleccionada!.numPatronal!, periodo, true, fechaHasta);
            });
          } else {
            this.ejecutarGrabado(empresaSeleccionada!.numPatronal!, periodo, true, fechaHasta);
          }
        }
      });
    });
  }

  private ejecutarGrabado(numPatronal: string, periodo: string, forzar: boolean, fechaHasta: Date): void {
    this.grabando = true;
    this.decimosService.grabar({
      numPatronal,
      periodo,
      idTipoNomEsp: this.idTipoNomEsp,
      forzar,
      idUsuario: this.idUsuario,
      fechaHasta: fechaHasta.toISOString().split('T')[0], 
      empleados: this.rowData
    }).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR') {
          this.showError(resp.message ?? 'Error al grabar.');
        } else {
          this.datosDesdeDB = true;
          this.showSuccess('Información grabada correctamente.');
        }
        this.grabando = false;
      },
      error: () => {
        this.showError('Error de conexión al grabar.');
        this.grabando = false;
      }
    });
  }

  exportar(formato: 'pdf' | 'excel'): void {
    console.log('Géneros:', this.rowData.map(e => ({ nombre: e.nombreEmpleado, genero: e.genero })));
    if (!this.rowData.length) {
      this.showError('No hay datos para exportar. Calcule primero.');
      return;
    }

    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    const config: DecimosExportConfig = {
      tipoNomina:   'Décimo Tercero', // cambiar en D14
      periodoDesde: this.periodoLabel.split('—')[0].trim(),
      periodoHasta: this.periodoLabel.split('—')[1].trim(),
      periodo:      new Date(this.form.value.fechaHasta).getFullYear().toString(),
      empresa:      empresaSeleccionada?.nombre ?? '',
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

  generarArchivo(): void {
    if (!this.datosDesdeDB || !this.rowData.length) {
      this.showError('Debe cargar un período grabado primero.');
      return;
    }

    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    const fechaHastaRaw = this.form.value.fechaHasta;
    const fechaHasta    = typeof fechaHastaRaw?.toDate === 'function'
                          ? fechaHastaRaw.toDate()
                          : new Date(fechaHastaRaw);

    const request: GenerarArchivoPichinchaRequest = {
      numPatronal:  empresaSeleccionada!.numPatronal!,
      periodo:      fechaHasta.getFullYear().toString(),
      idTipoNomEsp: this.idTipoNomEsp
    };

    this.decimosService.generarArchivoPichincha(request).subscribe({
      next: (blob) => {
        const url      = window.URL.createObjectURL(blob);
        const a        = document.createElement('a');
        a.href         = url;
        a.download     = `ARCHIVO_DECIMO_${request.periodo}_PICHINCHA.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.showError('Error al generar el archivo.')
    });
  }

  cancelar(): void {
    // Resetear solo los datos, no el formulario completo
    this.rowData = [];
    this.datosDesdeDB = false;
    this.mostrarPeriodo = false;
    this.periodoLabel   = '';
    this.gridApi?.setGridOption('rowData', []);
    this.calcularSubtotales();

    // Restaurar fecha actual y mantener los demás filtros
    this.form.patchValue({ fechaHasta: new Date() });
  }
  // ===== SUBTOTALES =====
  private calcularSubtotales(): void {
    this.totalValorDecimo = this.rowData.reduce((s, r) => s + (r.valorDecimo  ?? 0), 0);
    this.totalDescuento   = this.rowData.reduce((s, r) => s + (r.descuento    ?? 0), 0);
    this.totalRetJudicial = this.rowData.reduce((s, r) => s + (r.retJudicial  ?? 0), 0);
    this.totalLiquido     = this.rowData.reduce((s, r) => s + (r.liquidoARecibir ?? 0), 0);
  }

  private calcularLiquido(row: DecimosEmpleadoResponse): number {
    return (row.valorDecimo ?? 0) - (row.descuento ?? 0) - (row.retJudicial ?? 0);
  }

  // ===== HELPERS =====
  formatMoneda(value: number): string {
    if (value == null) return '$0.00';
    return '$' + Number(value).toFixed(2);
  }

  private showError(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: { title: 'Error', message, type: 'error', confirmText: 'Aceptar', showCancel: false } as MessageBoxData
    });
  }

  private showSuccess(message: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: { title: 'Éxito', message, type: 'success', confirmText: 'Aceptar', showCancel: false } as MessageBoxData
    });
  }
  
  private calcularPeriodoLabel(): void {
    const fechaRaw = this.form.value.fechaHasta;
    if (!fechaRaw) return;

    const fechaFin  = typeof fechaRaw?.toDate === 'function'
      ? fechaRaw.toDate()
      : new Date(fechaRaw);

    const año       = fechaFin.getFullYear();
    const regimenId = this.form.value.idRegimen;
    const regimen   = this.regimenes.find(r => r.id_regimen === regimenId);
    const esSierra  = regimen?.descripcion.toUpperCase().includes('SIERRA') ?? true;
    const mesInicio = esSierra ? 8 : 3;
    const añoInicio = fechaFin.getMonth() + 1 >= mesInicio ? año : año - 1;
    const inicio    = new Date(añoInicio, mesInicio - 1, 1);

    this.periodoLabel = `${this.formatFechaDate(inicio)} — ${this.formatFechaDate(fechaFin)}`;
  }

  private formatFechaDate(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

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

    this.dialog.open(PeriodosNominaDialogComponent, {
      width: '700px',
      data: {
        numPatronal:  empresaSeleccionada.numPatronal,
        idTipoNomEsp: this.idTipoNomEsp
      } as PeriodosNominaDialogData
    }).afterClosed().subscribe((result: PeriodosNominaDialogResult | null) => {
      if (!result?.seleccionado) return;

      const p = result.seleccionado;
      
      this.decimosService.recuperar(
        empresaSeleccionada.numPatronal!,
        p.periodo,
        p.idTipoNomEsp
      ).subscribe({
        next: (resp) => {
          if (resp.type === 'ERROR') {
            this.showError(resp.message ?? 'Error al cargar.');
            return;
          }

          this.rowData     = resp.data ?? [];
          this.datosDesdeDB = true;
          this.mostrarPeriodo = true;

          const esSierra = p.regimen?.toUpperCase().includes('SIERRA') ?? true;
          this.periodoLabel = esSierra
            ? `01/08/${parseInt(p.periodo) - 1} — 31/07/${p.periodo}`
            : `01/03/${parseInt(p.periodo) - 1} — 28/02/${p.periodo}`;
          // Para D14 Sierra: this.periodoLabel = `01/08/${parseInt(p.periodo) - 1} — 31/07/${p.periodo}`;

          this.gridApi?.setGridOption('rowData', this.rowData);
          this.calcularSubtotales();
        },
        error: () => this.showError('Error de conexión al cargar.')
      });
    });
  }

}