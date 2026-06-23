import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ApiResponse,
  RolIndividualResponse,
  RolIndividualRubroResponse,
  RolNominaService,
  GuardarRolIndividualRequest
} from 'src/app/services/rol/rol-nomina.service';

@Component({
  selector: 'app-rol-individual-dialog',
  templateUrl: './rol-individual-dialog.component.html',
  styleUrls: ['./rol-individual-dialog.component.css']
})
export class RolIndividualDialogComponent implements OnInit {
  cargando = false;

  dataRol: RolIndividualResponse | null = null;

  ingresos: RolIndividualRubroResponse[] = [];
  egresos: RolIndividualRubroResponse[] = [];

  totalIngresos = 0;
  totalEgresos = 0;
  liquidoRecibir = 0;

  guardando = false;
  hayCambios = false;
  rolActualizado = false;

  columnDefs: ColDef<RolIndividualRubroResponse>[] = [
    {
      field: 'descripcion',
      headerName: 'Rubro',
      flex: 1,
      minWidth: 220,
      editable: false
    },
    {
      field: 'cantidad',
      headerName: 'Cant/%',
      width: 100,
      editable: true,
      type: 'numericColumn',
      valueParser: params => this.toNumber(params.newValue),
      valueFormatter: params => this.formatearNumero(params.value),
      cellClass: params => {
        const row = params.data as RolIndividualRubroResponse;
        return row?.esHoraExtra || this.esRubroAusencia(row)
          ? 'celda-editable-hora'
          : '';
      }
    },
    {
      field: 'valor',
      headerName: 'Valor',
      width: 120,
      editable: params => {
        const row = params.data as RolIndividualRubroResponse;

        if (!row) {
          return false;
        }

        if (row.esHoraExtra) {
          return false;
        }

        if (this.esRubroPermisoMaternidad(row)) {
          return false;
        }

        if (this.esRubroEnfermedad(row)) {
          return false;
        }

        if (this.esRubroAccidenteTrabajo(row)) {
          return false;
        }

        if (this.esRubroAporteIess(row)) {
          return false;
        }
        if (this.esRubroImpuestoRenta(row)) {
  return false;
}
        if (this.esRubroFondoReserva(row)) {
          return false;
        }

        if (this.esRubroDecimoTercero(row)) {
          return false;
        }

        return true;
      },
      type: 'numericColumn',
      valueParser: params => this.toNumber(params.newValue),
      valueFormatter: params => this.formatearDecimal(params.value),
      cellClass: params => {
        const row = params.data as RolIndividualRubroResponse;

        return row?.esHoraExtra ||
          this.esRubroPermisoMaternidad(row) ||
          this.esRubroEnfermedad(row) ||
          this.esRubroAccidenteTrabajo(row) ||
          this.esRubroAporteIess(row) ||
          this.esRubroImpuestoRenta(row) ||
          this.esRubroFondoReserva(row) ||
          this.esRubroDecimoTercero(row)
          ? 'celda-calculada'
          : '';
      }
    }
  ];

  defaultColDef: ColDef = {
    sortable: false,
    filter: false,
    resizable: true
  };

  constructor(
    private rolNominaService: RolNominaService,
    private dialogRef: MatDialogRef<RolIndividualDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      idEmpleado: number;
      fechaPeriodo: string;
    }
  ) { }

  ngOnInit(): void {
    this.cargarRolIndividual();
  }

  cargarRolIndividual(): void {
    this.cargando = true;

    this.rolNominaService
      .getRolIndividual(this.data.idEmpleado, this.data.fechaPeriodo)
      .subscribe({
        next: (resp: ApiResponse<RolIndividualResponse>) => {
          this.cargando = false;

          if (resp.type !== 'Success') {
            this.mostrarMensajePorTipo(resp.type, resp.message);
            return;
          }

          this.dataRol = resp.data;

          this.ingresos = [...(resp.data.ingresos ?? [])];
          this.egresos = [...(resp.data.egresos ?? [])];

          this.calcularSinMarcarCambios();
        },
        error: err => {
          this.cargando = false;
          console.error(err);
          this.mostrarError('Error al cargar el rol individual.');
        }
      });
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

onCellValueChanged(event: CellValueChangedEvent<RolIndividualRubroResponse>): void {
  const row = event.data;

  if (!row) {
    return;
  }

  const campoEditado = event.colDef.field as keyof RolIndividualRubroResponse;
  const valorAnterior = this.toNumber(event.oldValue);

  row.cantidad = this.toNumber(row.cantidad);
  row.valor = this.toNumber(row.valor);

  if (!this.validarValorNoNegativo(row, campoEditado, valorAnterior)) {
    this.ingresos = [...this.ingresos];
    this.egresos = [...this.egresos];
    this.calcularSinMarcarCambios();
    return;
  }

  if (!this.validarDiasAusenciaEditada(row, valorAnterior)) {
    this.ingresos = [...this.ingresos];
    this.egresos = [...this.egresos];
    this.calcularSinMarcarCambios();
    return;
  }

  this.calcular();
}

  recalcularTotales(): void {
    this.totalIngresos = this.ingresos
      .filter(item => !this.esRubroSueldo(item))
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

    this.totalEgresos = this.egresos.reduce(
      (acc, item) => acc + this.toNumber(item.valor),
      0
    );

    this.liquidoRecibir = this.totalIngresos - this.totalEgresos;
  }

  cerrar(): void {
    this.dialogRef.close(this.rolActualizado);
  }

  salir(): void {
    if (!this.hayCambios) {
      this.dialogRef.close(this.rolActualizado);
      return;
    }

    const guardarAntes = confirm(
      'Existen cambios pendientes. ¿Desea guardar antes de salir?'
    );

    if (guardarAntes) {
      this.grabar(true);
      return;
    }

    this.dialogRef.close(this.rolActualizado);
  }

  get fechaPeriodoTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaPeriodo);
  }

  get fechaIngresoTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaIngreso);
  }

  get fechaSalidaTexto(): string {
    return this.formatearFechaDateOnly(this.dataRol?.fechaSalida);
  }

  calcular(): boolean {
    this.normalizarValores();

    if (!this.validarAusenciasAntesDeCalcular(true)) {
      return false;
    }

    this.recalcularDiasTrabajadosPorAusencias();

    this.ingresos.forEach(row => {
      if (row.esHoraExtra) {
        row.valor = this.calcularValorHoraExtra(row);
      }

      if (this.esRubroPermisoMaternidad(row)) {
        row.valor = this.calcularPermisoMaternidad(row);
      }

      if (this.esRubroEnfermedad(row)) {
        row.valor = this.calcularEnfermedad(row);
      }

      if (this.esRubroAccidenteTrabajo(row)) {
        row.valor = this.calcularAccidenteTrabajo(row);
      }
    });

    this.recalcularFondoReserva();
    this.recalcularDecimoTercero();
    this.recalcularAporteIess();

    this.ingresos = [...this.ingresos];
    this.egresos = [...this.egresos];

    this.recalcularTotales();
    this.hayCambios = true;

    return true;
  }

  private calcularSinMarcarCambios(): void {
    this.normalizarValores();

    if (!this.validarAusenciasAntesDeCalcular(false)) {
      this.recalcularTotales();
      this.hayCambios = false;
      return;
    }

    this.recalcularDiasTrabajadosPorAusencias();

    this.ingresos.forEach(row => {
      if (row.esHoraExtra) {
        row.valor = this.calcularValorHoraExtra(row);
      }

      if (this.esRubroPermisoMaternidad(row)) {
        row.valor = this.calcularPermisoMaternidad(row);
      }

      if (this.esRubroEnfermedad(row)) {
        row.valor = this.calcularEnfermedad(row);
      }

      if (this.esRubroAccidenteTrabajo(row)) {
        row.valor = this.calcularAccidenteTrabajo(row);
      }
    });

    this.recalcularFondoReserva();
    this.recalcularDecimoTercero();
    this.recalcularAporteIess();

    this.ingresos = [...this.ingresos];
    this.egresos = [...this.egresos];

    this.recalcularTotales();
    this.hayCambios = false;
  }

  grabar(cerrarDespues: boolean = false): void {
  if (!this.dataRol) {
    this.mostrarAdvertencia('No existe información del rol individual.');
    return;
  }

  if (!this.validarRubrosNoNegativosAntesDeGuardar()) {
  return;
}

if (!this.validarAusenciasAntesDeGuardar()) {
  return;
}

if (!this.calcular()) {
  return;
}

  if (!this.validarLiquidoRecibir()) {
    return;
  }

  const payload: GuardarRolIndividualRequest = {
      idEmpleado: this.dataRol.idEmpleado,
      fechaPeriodo: this.dataRol.fechaPeriodo,
      idUsuario: 1,
      rubros: [
        ...this.ingresos,
        ...this.egresos
      ].map(x => ({
        idRolNomina: x.idRolNomina,
        idIngDesc: x.idIngDesc,
        tipoPago: x.tipoPago,
        codigo: x.codigo,
        descripcion: x.descripcion,
        cantidad: this.toNumber(x.cantidad),
        valor: this.toNumber(x.valor),
        esHoraExtra: x.esHoraExtra,
        factorHoraExtra: this.toNumber(x.factorHoraExtra),

        aportaIess: x.aportaIess,
        aplicaImpuestoRenta: x.aplicaImpuestoRenta,
        aplicaFondoReserva: x.aplicaFondoReserva,
        aplicaDecimoTercero: x.aplicaDecimoTercero
      }))
    };

    this.guardando = true;

    this.rolNominaService.guardarRolIndividual(payload)
      .subscribe({
        next: resp => {
          this.guardando = false;

          if (resp.type !== 'Success') {
            this.mostrarMensajePorTipo(resp.type, resp.message);
            return;
          }

          this.hayCambios = false;
          this.rolActualizado = true;

          this.mostrarMensajePorTipo(resp.type, resp.message);

          if (cerrarDespues) {
            this.dialogRef.close(true);
            return;
          }

          this.cargarRolIndividual();
        },
        error: err => {
          this.guardando = false;
          console.error(err);
          this.mostrarError('Error al guardar el rol individual.');
        }
      });
  }

 private normalizarValores(): void {
  this.ingresos.forEach(row => {
    row.cantidad = this.toNumber(row.cantidad);
    row.valor = this.toNumber(row.valor);

    if (row.cantidad < 0) {
      row.cantidad = 0;
    }

    if (row.valor < 0) {
      row.valor = 0;
    }
  });

  this.egresos.forEach(row => {
    row.cantidad = this.toNumber(row.cantidad);
    row.valor = this.toNumber(row.valor);

    if (row.cantidad < 0) {
      row.cantidad = 0;
    }

    if (row.valor < 0) {
      row.valor = 0;
    }
  });
}
  private validarDiasAusenciaEditada(
    row: RolIndividualRubroResponse,
    valorAnterior: number
  ): boolean {
    if (!this.esRubroAusencia(row)) {
      return true;
    }

    const dias = this.toNumber(row.cantidad);

    if (dias < 0) {
      row.cantidad = valorAnterior;
      this.mostrarAdvertencia('Los días no pueden ser negativos.');
      return false;
    }

    if (dias > 30) {
      row.cantidad = valorAnterior;
      this.mostrarAdvertencia('No puede ingresar más de 30 días en un rubro de ausencia.');
      return false;
    }

    const totalDiasAusencia = this.obtenerDiasAusencias();

    if (totalDiasAusencia > 30) {
      row.cantidad = valorAnterior;
      this.mostrarAdvertencia(
        'La suma de días de maternidad, enfermedad y accidente de trabajo no puede superar 30 días.'
      );
      return false;
    }

    return true;
  }

  private validarAusenciasAntesDeCalcular(mostrarMensaje: boolean): boolean {
    const rubroInvalido = this.ingresos.find(x =>
      this.esRubroAusencia(x) &&
      (
        this.toNumber(x.cantidad) < 0 ||
        this.toNumber(x.cantidad) > 30
      )
    );

    if (rubroInvalido) {
      if (mostrarMensaje) {
        this.mostrarAdvertencia(
          `El rubro ${rubroInvalido.descripcion} no puede tener menos de 0 ni más de 30 días.`
        );
      }

      return false;
    }

    const totalDiasAusencia = this.obtenerDiasAusencias();

    if (totalDiasAusencia > 30) {
      if (mostrarMensaje) {
        this.mostrarAdvertencia(
          'La suma de días de maternidad, enfermedad y accidente de trabajo no puede superar 30 días.'
        );
      }

      return false;
    }

    return true;
  }

  private validarAusenciasAntesDeGuardar(): boolean {
    return this.validarAusenciasAntesDeCalcular(true);
  }

  private recalcularDiasTrabajadosPorAusencias(): void {
    const sueldo = this.toNumber(this.dataRol?.sueldo);
    const diasBase = 30;

    const diasAusencia = this.obtenerDiasAusencias();
    const diasTrabajados = Math.max(diasBase - diasAusencia, 0);

    const rubroDiasTrabajados = this.ingresos.find(x =>
      this.esRubroDiasTrabajados(x)
    );

    if (rubroDiasTrabajados) {
      rubroDiasTrabajados.cantidad = diasTrabajados;
      rubroDiasTrabajados.valor = this.redondear(
        (sueldo / diasBase) * diasTrabajados
      );
    }
  }

  private recalcularAporteIess(): void {
    const porcentajeIess = this.toNumber(
      this.dataRol?.porcentajeIessPersonal || 9.45
    );

    const usarBasePorAusencia =
      this.hayEnfermedad() ||
      this.hayAccidenteTrabajo();

    const baseIess = this.ingresos
      .filter(x => x.tipoPago === 'I')
      .filter(x => x.aportaIess === true)
      .filter(x => !this.esRubroPermisoMaternidad(x))
      .filter(x => !this.esRubroFondoReserva(x))
      .filter(x => !this.esRubroDecimoTercero(x))
      .filter(x => !this.esRubroEnfermedad(x))
      .filter(x => !this.esRubroAccidenteTrabajo(x))
      .filter(x => {
        if (usarBasePorAusencia) {
          return !this.esRubroSueldo(x);
        }

        return !this.esRubroDiasTrabajados(x);
      })
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

    const rubroIess = this.egresos.find(x => this.esRubroAporteIess(x));

    if (rubroIess) {
      rubroIess.valor = this.redondear(baseIess * porcentajeIess / 100);
      rubroIess.cantidad = 0;
    }
  }

  private recalcularFondoReserva(): void {
    const rubroFondoReserva = this.ingresos.find(x =>
      this.esRubroFondoReserva(x)
    );

    if (!rubroFondoReserva) {
      return;
    }

    if (!this.dataRol?.tieneDerechoFondoReserva) {
      rubroFondoReserva.valor = 0;
      rubroFondoReserva.cantidad = 0;
      return;
    }

    const porcentajeFondoReserva = this.toNumber(
      this.dataRol?.porcentajeFondoReserva || 8.33
    );

    const usarBasePorAusencia =
      this.hayEnfermedad() ||
      this.hayAccidenteTrabajo();

    const baseFondoReserva = this.ingresos
      .filter(x => x.tipoPago === 'I')
      .filter(x => x.aplicaFondoReserva === true)
      .filter(x => !this.esRubroPermisoMaternidad(x))
      .filter(x => !this.esRubroFondoReserva(x))
      .filter(x => !this.esRubroDecimoTercero(x))
      .filter(x => !this.esRubroEnfermedad(x))
      .filter(x => !this.esRubroAccidenteTrabajo(x))
      .filter(x => {
        if (usarBasePorAusencia) {
          return !this.esRubroSueldo(x);
        }

        return !this.esRubroDiasTrabajados(x);
      })
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

    rubroFondoReserva.valor = this.redondear(
      baseFondoReserva * porcentajeFondoReserva / 100
    );

    rubroFondoReserva.cantidad = 0;
  }

  private recalcularDecimoTercero(): void {
    const usarBasePorAusencia =
      this.hayEnfermedad() ||
      this.hayAccidenteTrabajo();

    const baseDecimoTercero = this.ingresos
      .filter(x => x.tipoPago === 'I')
      .filter(x => x.aplicaDecimoTercero === true)
      .filter(x => !this.esRubroPermisoMaternidad(x))
      .filter(x => !this.esRubroFondoReserva(x))
      .filter(x => !this.esRubroDecimoTercero(x))
      .filter(x => !this.esRubroEnfermedad(x))
      .filter(x => !this.esRubroAccidenteTrabajo(x))
      .filter(x => {
        if (usarBasePorAusencia) {
          return !this.esRubroSueldo(x);
        }

        return !this.esRubroDiasTrabajados(x);
      })
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

    const rubroDecimoTercero = this.ingresos.find(x =>
      this.esRubroDecimoTercero(x)
    );

    if (rubroDecimoTercero) {
      rubroDecimoTercero.valor = this.redondear(baseDecimoTercero / 12);
      rubroDecimoTercero.cantidad = 0;
    }
  }

  private calcularValorHoraExtra(row: RolIndividualRubroResponse): number {
    const valorHoraBase = this.toNumber(this.dataRol?.valorHoraBase);
    const cantidad = this.toNumber(row.cantidad);
    const factor = this.toNumber(row.factorHoraExtra);

    if (valorHoraBase <= 0 || cantidad <= 0 || factor <= 0) {
      return 0;
    }

    return this.redondear(valorHoraBase * cantidad * factor);
  }

  private calcularPermisoMaternidad(row: RolIndividualRubroResponse): number {
    const sueldo = this.toNumber(this.dataRol?.sueldo);
    const diasMaternidad = this.toNumber(row.cantidad);

    if (sueldo <= 0 || diasMaternidad <= 0) {
      return 0;
    }

    return this.redondear((sueldo / 30) * 0.25 * diasMaternidad);
  }

  private calcularEnfermedad(row: RolIndividualRubroResponse): number {
    const sueldo = this.toNumber(this.dataRol?.sueldo);
    const dias = this.toNumber(row.cantidad);
    const factor = this.obtenerFactorEnfermedad(row);

    if (sueldo <= 0 || dias <= 0) {
      return 0;
    }

    return this.redondear((sueldo / 30) * factor * dias);
  }

  private calcularAccidenteTrabajo(row: RolIndividualRubroResponse): number {
    const sueldo = this.toNumber(this.dataRol?.sueldo);
    const dias = this.toNumber(row.cantidad);
    const factor = this.obtenerFactorAccidenteTrabajo(row);

    if (sueldo <= 0 || dias <= 0) {
      return 0;
    }

    return this.redondear((sueldo / 30) * factor * dias);
  }

  private obtenerFactorEnfermedad(row: RolIndividualRubroResponse): number {
    const codigo = this.normalizarCodigo(row.codigo);

    switch (codigo) {
      case '06':
        return 0.25;
      case '49':
        return 1.00;
      case '50':
        return 0.50;
      case '52':
        return 0.00;
      default:
        return 0;
    }
  }

  private obtenerFactorAccidenteTrabajo(row: RolIndividualRubroResponse): number {
    const codigo = this.normalizarCodigo(row.codigo);

    switch (codigo) {
      case '51':
        return 1.00;
      case '53':
        return 0.00;
      default:
        return 0;
    }
  }

  private obtenerDiasMaternidad(): number {
    return this.ingresos
      .filter(x => this.esRubroPermisoMaternidad(x))
      .reduce((acc, item) => acc + this.toNumber(item.cantidad), 0);
  }

  private obtenerDiasEnfermedad(): number {
    return this.ingresos
      .filter(x => this.esRubroEnfermedad(x))
      .reduce((acc, item) => acc + this.toNumber(item.cantidad), 0);
  }

  private obtenerDiasAccidenteTrabajo(): number {
    return this.ingresos
      .filter(x => this.esRubroAccidenteTrabajo(x))
      .reduce((acc, item) => acc + this.toNumber(item.cantidad), 0);
  }

  private obtenerDiasAusencias(): number {
    return this.obtenerDiasMaternidad() +
      this.obtenerDiasEnfermedad() +
      this.obtenerDiasAccidenteTrabajo();
  }

  private hayEnfermedad(): boolean {
    return this.ingresos.some(x =>
      this.esRubroEnfermedad(x) && this.toNumber(x.cantidad) > 0
    );
  }

  private hayAccidenteTrabajo(): boolean {
    return this.ingresos.some(x =>
      this.esRubroAccidenteTrabajo(x) && this.toNumber(x.cantidad) > 0
    );
  }

  private esRubroAusencia(row: RolIndividualRubroResponse): boolean {
    return this.esRubroPermisoMaternidad(row) ||
      this.esRubroEnfermedad(row) ||
      this.esRubroAccidenteTrabajo(row);
  }

  private esRubroSueldo(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'I' && this.normalizarCodigo(row.codigo) === '03';
  }

  private esRubroDiasTrabajados(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'I' && this.normalizarCodigo(row.codigo) === '02';
  }

  private esRubroPermisoMaternidad(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'I' && this.normalizarCodigo(row.codigo) === '05';
  }

  private esRubroEnfermedad(row: RolIndividualRubroResponse): boolean {
    const codigo = this.normalizarCodigo(row.codigo);

    return row.tipoPago === 'I' &&
      (
        codigo === '06' ||
        codigo === '49' ||
        codigo === '50' ||
        codigo === '52'
      );
  }

  private esRubroAccidenteTrabajo(row: RolIndividualRubroResponse): boolean {
    const codigo = this.normalizarCodigo(row.codigo);

    return row.tipoPago === 'I' &&
      (
        codigo === '51' ||
        codigo === '53'
      );
  }

  private esRubroAporteIess(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'D' && this.normalizarCodigo(row.codigo) === '25';
  }
private esRubroImpuestoRenta(row: RolIndividualRubroResponse): boolean {
  return row.tipoPago === 'D' && this.normalizarCodigo(row.codigo) === '06';
}
  private esRubroFondoReserva(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'I' && this.normalizarCodigo(row.codigo) === '18';
  }

  private esRubroDecimoTercero(row: RolIndividualRubroResponse): boolean {
    return row.tipoPago === 'I' && this.normalizarCodigo(row.codigo) === '46';
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private normalizarCodigo(codigo: string | null | undefined): string {
    if (!codigo) {
      return '';
    }

    const texto = codigo.toString().trim();
    const numero = Number(texto);

    if (!isNaN(numero)) {
      return numero.toString().padStart(2, '0');
    }

    return texto;
  }

  private formatearNumero(valor: any): string {
    const n = this.toNumber(valor);
    return n === 0 ? '' : n.toString();
  }

  private formatearDecimal(valor: any): string {
    const n = this.toNumber(valor);
    return n === 0 ? '' : n.toFixed(2);
  }

  private formatearFechaDateOnly(fecha: string | null | undefined): string {
    if (!fecha) {
      return 'N/D';
    }

    const soloFecha = fecha.substring(0, 10);
    const partes = soloFecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const anio = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${anio}`;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-success']
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 7000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-error']
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-warning']
    });
  }

  private mostrarMensajePorTipo(type: string, mensaje: string): void {
    const tipo = (type || '').toLowerCase();

    if (tipo === 'success') {
      this.mostrarExito(mensaje);
      return;
    }

    if (tipo === 'warning') {
      this.mostrarAdvertencia(mensaje);
      return;
    }

    this.mostrarError(mensaje);
  }
  private validarLiquidoRecibir(): boolean {
  this.recalcularTotales();

  if (this.liquidoRecibir < 0) {
    this.mostrarAdvertencia(
      'No se puede grabar el rol individual porque el líquido a recibir no puede ser negativo.'
    );
    return false;
  }

  return true;
}
private validarValorNoNegativo(
  row: RolIndividualRubroResponse,
  campoEditado: keyof RolIndividualRubroResponse,
  valorAnterior: number
): boolean {
  if (campoEditado === 'cantidad' && this.toNumber(row.cantidad) < 0) {
    row.cantidad = valorAnterior;
    this.mostrarAdvertencia('No puede ingresar cantidades negativas.');
    return false;
  }

  if (campoEditado === 'valor' && this.toNumber(row.valor) < 0) {
    row.valor = valorAnterior;
    this.mostrarAdvertencia('No puede ingresar valores negativos.');
    return false;
  }

  return true;
}

private validarRubrosNoNegativosAntesDeGuardar(): boolean {
  const rubroInvalido = [...this.ingresos, ...this.egresos].find(x =>
    this.toNumber(x.cantidad) < 0 || this.toNumber(x.valor) < 0
  );

  if (rubroInvalido) {
    this.mostrarAdvertencia(
      `El rubro ${rubroInvalido.descripcion} no puede tener cantidad ni valor negativo.`
    );
    return false;
  }

  return true;
}
}