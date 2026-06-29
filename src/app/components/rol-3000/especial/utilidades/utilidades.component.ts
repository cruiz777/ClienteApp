import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';
import { UsuarioService } from 'src/app/services/usuario.service';
import { EmpresaService, EmpresaComboResponse } from 'src/app/services/empresa.service';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { TipoNominaEspService } from 'src/app/services/rol/tipo-nomina-esp.service';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { UtilidadesService } from 'src/app/services/rol/utilidades.service';
import { UtilidadEmpleadoResponse } from 'src/app/interfaces/responses/utilidades-response';
import { UtilidadesRequest, GrabarUtilidadesRequest } from 'src/app/interfaces/requests/utilidades-request';

@Component({
  selector: 'app-utilidades',
  templateUrl: './utilidades.component.html',
  styleUrls: ['./utilidades.component.css']
})
export class UtilidadesComponent implements OnInit {

  // ===== FORMULARIO =====
  form!: FormGroup;
  loading  = false;
  grabando = false;
  datosDesdeDB = false;
  recalculando = false;

  // ===== SESIÓN =====
  usuarioActual: LoginUsuarioResponse | null = null;
  idUsuario!: number;
  idEmpresa!: number;

  // ===== COMBOS =====
  empresas:    EmpresaComboResponse[]  = [];
  tiposNomina: TipoNominaEspResponse[] = [];
  idTipoNomEsp!: number;
  readonly tiposEmpleado = [
    { id: 2, descripcion: 'FIJOS' }
  ];
  // ID FIJOS — solo tipo empleado 2
  readonly ID_TIPO_EMP_FIJOS = 2;

  // ===== AG GRID =====
  gridApi!: GridApi;
  rowData: UtilidadEmpleadoResponse[] = [];

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
      field: 'numeroAfiliacion',
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
      field: 'nombre',
      width: 250
    },
    {
      headerName: 'Cónyuge',
      field: 'conyuge',
      width: 100,
      valueFormatter: (p: ValueFormatterParams) => p.value ? 'Sí' : 'No'
    },
    {
      headerName: 'Hijos',
      field: 'hijos',
      width: 80,
      type: 'rightAligned'
    },
    {
      headerName: 'Nº Días',
      field: 'numeroDias',
      width: 90,
      type: 'rightAligned'
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
      headerName: 'Alícuota Empleado',
      field: 'alicuotaEmpleado',
      width: 150,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Alícuota Carga',
      field: 'alicuotaCarga',
      width: 130,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Valor Empleado',
      field: 'valorEmpleado',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Valor Carga',
      field: 'valorCarga',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p: ValueFormatterParams) => this.formatMoneda(p.value)
    },
    {
      headerName: 'Observaciones',
      field: 'observaciones',
      width: 200
    }
  ];

  defaultColDef: ColDef = {
    sortable:  true,
    filter:    true,
    resizable: true
  };

  // ===== SUBTOTALES =====
  totalValorEmpleado = 0;
  totalValorCarga    = 0;
  totalGeneral       = 0;

  constructor(
    private fb:               FormBuilder,
    private dialog:           MatDialog,
    private usuarioService:   UsuarioService,
    private empresaService:   EmpresaService,
    private tipoNominaService: TipoNominaEspService,
    private utilidadesService: UtilidadesService
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
      idEmpresa: [null, Validators.required],
      periodo: [new Date().getFullYear(), Validators.required],
      idTipEmp: [2], //Actualmente solo para FIJOS
      monto10: [0, [Validators.required, Validators.min(0)]],  // 10% empleados
      monto5: [0, [Validators.required, Validators.min(0)]]   // 5%  cargas
    });
  }

  // ===== COMBOS =====
  private cargarCombos(): void {
    this.empresaService.getCombo().subscribe({
      next: (data) => {
        this.empresas = data;
        const emp = this.empresas.find(e => e.idEmpresa === this.idEmpresa);
        if (emp) this.form.patchValue({ idEmpresa: emp.idEmpresa });
      }
    });

    this.tipoNominaService.getAll().subscribe({
      next: (resp) => {
        this.tiposNomina = resp.data ?? [];
        const util = this.tiposNomina.find(t =>
          t.descripcion?.toUpperCase().includes('UTILIDAD')
        );
        if (util) this.idTipoNomEsp = util.idTipoNomEsp;
      }
    });
  }

  // ===== GRID =====
  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  // ===== CALCULAR =====
  calcular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // ===== VALIDACIÓN MONTOS =====
    const monto10 = this.form.value.monto10;
    const monto5  = this.form.value.monto5;

    if (!monto10 || !monto5) {
      this.showError('Debe ingresar el monto del 10% y el monto del 5% antes de calcular.');
      return;
    }
    // Si datos vienen de DB → preguntar antes de recalcular
    if (this.datosDesdeDB) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '450px',
        data: {
          title:       'Período ya registrado',
          message:     `Ya existe información grabada del período ${this.form.value.periodo}. ¿Desea recalcular y perder los datos actuales?`,
          type:        'warning',
          confirmText: 'Sí, recalcular',
          cancelText:  'Cancelar',
          showCancel:  true
        } as MessageBoxData
      }).afterClosed().subscribe((confirmado: boolean) => {
        if (!confirmado) return;
        this.datosDesdeDB = false;
        this.ejecutarCalcular();
      });
      return;
    }

    // Verificar en BD si ya existe
    const empresaSeleccionada = this.empresas.find(
      e => e.idEmpresa === this.form.value.idEmpresa
    );

    this.utilidadesService.recuperar(
      empresaSeleccionada!.numPatronal!,
      this.form.value.periodo.toString(),
      this.idTipoNomEsp
    ).subscribe({
      next: (resp) => {
        if (resp.data && resp.data.length > 0) {
          this.dialog.open(CustomMessageBoxComponent, {
            width: '450px',
            data: {
              title:       'Período ya registrado',
              message:     `Ya existe información grabada del período ${this.form.value.periodo}. Use "Cargar" para ver los datos o "Recalcular" para generar nuevamente.`,
              type:        'info',
              confirmText: 'Entendido',
              showCancel:  false
            } as MessageBoxData
          });
        } else {
          this.ejecutarCalcular();
        }
      },
      error: () => this.ejecutarCalcular()
    });
  }

  private ejecutarCalcular(): void {
    const request: UtilidadesRequest = {
      periodo:        this.form.value.periodo,
      montoEmpleados: this.form.value.monto10,
      montoCargas:    this.form.value.monto5,
      tiposEmpleado:  [this.ID_TIPO_EMP_FIJOS]
    };

    this.loading      = true;
    this.recalculando = true; // ← marca que estamos recalculando
    
    this.utilidadesService.calcular(request).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR') {
          this.showError(resp.message ?? 'Error al calcular.');
        } else {
          this.rowData      = resp.data ?? [];
          this.datosDesdeDB = false;
          this.recalculando = false; // ← resetea
          this.gridApi?.setGridOption('rowData', this.rowData);
          this.calcularSubtotales();
        }
        this.loading = false;
      },
      error: () => {
        this.showError('Error de conexión al calcular.');
        this.loading      = false;
        this.recalculando = false;
      }
    });
  }

  // ===== GRABAR =====
  grabar(): void {
    if (!this.rowData.length) {
      this.showError('No hay datos para grabar. Calcule primero.');
      return;
    }

    if (this.recalculando) return; // ← evita que se dispare solo

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

    const periodo = this.form.value.periodo.toString();

    const request: GrabarUtilidadesRequest = {
      numPatronal:   empresaSeleccionada!.numPatronal!,
      periodo,
      idTipoNomEsp:  this.idTipoNomEsp,
      idUsuario:     this.idUsuario,
      fechaEmision:  `${periodo}-12-31`,  // último día del año
      forzar,
      montoEmpleados: this.form.value.monto10,  // 10%
      montoCargas:    this.form.value.monto5,   // 5%
      tiposEmpleado:  [this.ID_TIPO_EMP_FIJOS]
    };

    this.grabando = true;
    this.utilidadesService.grabar(request).subscribe({
      next: (resp) => {
        if (resp.type === 'ERROR' || resp.type === 'WARNING') {
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
          this.showSuccess('Utilidades grabadas correctamente.');
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

  // ===== CARGAR =====
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

    this.loading = true;
    this.utilidadesService.recuperar(
      empresaSeleccionada.numPatronal,
      this.form.value.periodo.toString(),
      this.idTipoNomEsp
    ).subscribe({
      next: (resp) => {
        if (!resp.data || resp.data.length === 0) {
          this.showError('No existe información grabada para este período.');
        } else {
          this.rowData      = resp.data;
          this.datosDesdeDB = true;  // ← activa el flag
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
    this.gridApi?.setGridOption('rowData', []);
    this.calcularSubtotales();
    this.form.patchValue({
      monto10: 0,
      monto5:  0
    });
  }

  // ===== SUBTOTALES =====
  private calcularSubtotales(): void {
    this.totalValorEmpleado = this.rowData.reduce((s, r) => s + (r.valorEmpleado ?? 0), 0);
    this.totalValorCarga    = this.rowData.reduce((s, r) => s + (r.valorCarga    ?? 0), 0);
    this.totalGeneral       = this.totalValorEmpleado + this.totalValorCarga;
  }

  // ===== HELPERS =====
  formatFecha(value: string | null): string {
    if (!value) return '';
    const [anio, mes, dia] = value.split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
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