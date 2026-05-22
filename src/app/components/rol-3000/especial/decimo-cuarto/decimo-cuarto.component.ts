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

@Component({
  selector: 'app-decimo-cuarto',
  templateUrl: './decimo-cuarto.component.html',
  styleUrls: ['./decimo-cuarto.component.css']
})
export class DecimoCuartoComponent implements OnInit {

  // ===== FORMULARIO =====
  form!: FormGroup;
  loading = false;
  grabando = false;

  // ===== SESIÓN =====
  usuarioActual: LoginUsuarioResponse | null = null;
  idUsuario!: number;
  idEmpresa!: number;

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
    { headerName: 'Fec. Ingreso', field: 'fechaIngreso', width: 120 },
    { headerName: 'Fec. Salida', field: 'fechaSalida', width: 120 },
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
    private decimosService: DecimosService
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

    // Tipos de empleado
    this.tipEmpService.getAll().subscribe({
      next: (resp) => this.tiposEmpleado = resp.data ?? []
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
      this.showError('No se encontró el tipo de nómina Décimo Tercero en el catálogo.');
      return;
    }

    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    if (!empresaSeleccionada?.numPatronal) {
      this.showError('La empresa seleccionada no tiene número patronal.');
      return;
    }

    const fechaHasta = this.form.value.fechaHasta as Date;

    const request = {
      numPatronal:  empresaSeleccionada.numPatronal,
      idTipEmp:     this.form.value.idTipEmp,
      fechaHasta:   fechaHasta.toISOString().split('T')[0],
      idTipoNomEsp: this.idTipoNomEsp,
      idRegimen: this.form.value.idRegimen
    };

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

    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    const periodo = new Date(this.form.value.fechaHasta).getFullYear().toString();

    // Verificar si ya existe
    this.decimosService.existe(
      empresaSeleccionada!.numPatronal!,
      periodo,
      this.idTipoNomEsp
    ).subscribe({
      next: (resp) => {
        if (resp.data) {
          // Ya existe — preguntar al usuario
          this.dialog.open(CustomMessageBoxComponent, {
            width: '450px',
            data: {
              title: 'Nómina Especial',
              message: '¡Actualmente ya existe información generada del período solicitado! ¿Desea eliminar lo almacenado y generar nuevamente?',
              type: 'warning',
              confirmText: 'Sí, reemplazar',
              cancelText: 'No',
              showCancel: true
            } as MessageBoxData
          }).afterClosed().subscribe(confirmado => {
            if (confirmado) this.ejecutarGrabado(empresaSeleccionada!.numPatronal!, periodo, true);
          });
        } else {
          this.ejecutarGrabado(empresaSeleccionada!.numPatronal!, periodo, false);
        }
      }
    });
  }

  private ejecutarGrabado(numPatronal: string, periodo: string, forzar: boolean): void {
    this.grabando = true;
    this.decimosService.grabar({
      numPatronal,
      periodo,
      idTipoNomEsp: this.idTipoNomEsp,
      forzar,
      idUsuario: this.idUsuario,
      empleados: this.rowData
    }).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR') {
          this.showError(resp.message ?? 'Error al grabar.');
        } else {
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
  cancelar(): void {
    this.form.reset();
    this.rowData = [];
    this.gridApi?.setGridOption('rowData', []);
    this.calcularSubtotales();
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
}