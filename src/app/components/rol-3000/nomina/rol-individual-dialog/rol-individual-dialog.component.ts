import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
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
  private diasTrabajadosBasePeriodo = 30;
  private valorDiasTrabajadosBasePeriodo = 0;
  usuarioActual = this.usuarioService.getUsuarioActual();
  guardando = false;
  hayCambios = false;
  rolActualizado = false;
  private valoresAutomaticosRubrosManuales = new Map<number, number>();
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
      editable: params => {
        const row = params.data as RolIndividualRubroResponse;

        if (!row) {
          return false;
        }

        if (this.esRubroAporteIess(row)) {
          return false;
        }

        /*
         * IMP. RENTA:
         * Permitimos editar Cant/% para poner 1.
         * Cant/% = 1 significa valor manual.
         */
        if (this.esRubroManualEditable(row)) {
          return true;
        }
        return true;
      },
      type: 'numericColumn',
      valueParser: params => this.toNumber(params.newValue),
      valueFormatter: params => this.formatearNumero(params.value),
      cellClass: params => {
        const row = params.data as RolIndividualRubroResponse;

        return row?.esHoraExtra ||
          this.esRubroAusencia(row) ||
          this.esRubroManualEditable(row)
          ? 'celda-editable-hora'
          : '';
      }
    }, {
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

        /*
         * IMP. RENTA:
         * Solo permite editar valor si Cant/% = 1.
         */
        if (this.esRubroManualEditable(row)) {
          return this.esRubroManualActivo(row);
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

        if (this.esRubroManualEditable(row)) {
          return this.esRubroManualActivo(row)
            ? 'celda-editable-hora'
            : 'celda-calculada';
        }
        return row?.esHoraExtra ||
          this.esRubroPermisoMaternidad(row) ||
          this.esRubroEnfermedad(row) ||
          this.esRubroAccidenteTrabajo(row) ||
          this.esRubroAporteIess(row) ||
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
    private dialog: MatDialog,
    private usuarioService: UsuarioService,
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

          this.guardarDiasTrabajadosBasePeriodo();

          this.aplicarValorAutomaticoAnticipoQuincena();

          this.guardarValoresAutomaticosRubrosManuales();

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

    /*
     * RUBROS MANUALES:
     *
     * Aplica para:
     * - IMP. RENTA
     * - ANTICIPO I QUINCENA
     *
     * Regla:
     *
     * Cant/% = 1:
     * - El valor queda manual.
     * - El usuario puede cambiar Valor.
     * - No se toma el valor automático.
     *
     * Cant/% != 1:
     * - El valor vuelve al original que vino del backend.
     * - Ejemplo: ANTICIPO I QUINCENA vuelve a 480.
     */
    if (this.esRubroManualEditable(row)) {
      if (campoEditado === 'cantidad') {
        row.cantidad = this.toNumber(row.cantidad);

        if (this.esRubroManualActivo(row)) {
          /*
           * Cant/% = 1.
           * No tocar row.valor.
           * Si estaba 480, queda 480 para que el usuario lo cambie.
           */
          this.recalcularTotales();
          this.hayCambios = true;

          event.api.refreshCells({
            force: true,
            rowNodes: [event.node]
          });

          return;
        }

        /*
         * Cant/% distinto de 1.
         * Restaurar valor automático original del empleado.
         * Ejemplo: ANTICIPO I QUINCENA = 480.
         */
        row.valor = this.obtenerValorAutomaticoRubroManual(row);

        this.recalcularTotales();
        this.hayCambios = true;

        event.api.refreshCells({
          force: true,
          rowNodes: [event.node]
        });

        return;
      }

      if (campoEditado === 'valor') {
        if (this.esRubroManualActivo(row)) {
          /*
           * Valor digitado manualmente.
           * No recalcular desde parámetro.
           */
          row.valor = this.toNumber(row.valor);

          this.recalcularTotales();
          this.hayCambios = true;

          event.api.refreshCells({
            force: true,
            rowNodes: [event.node]
          });

          return;
        }

        /*
         * Si intenta editar valor sin Cant/% = 1,
         * se restaura el valor automático.
         */
        row.valor = this.obtenerValorAutomaticoRubroManual(row);

        this.recalcularTotales();

        event.api.refreshCells({
          force: true,
          rowNodes: [event.node]
        });

        return;
      }
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

    this.confirmarAccion(
      'Cambios pendientes',
      'Existen cambios pendientes. ¿Desea guardar antes de salir?',
      'Sí, guardar',
      'Salir sin guardar'
    ).subscribe((confirmado: boolean) => {
      if (confirmado === true) {
        this.grabar(true);
        return;
      }

      this.dialogRef.close(this.rolActualizado);
    });
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

    /*
     * Guardamos los rubros manuales activos.
     *
     * Solo se consideran manuales cuando Cant/% = 1.
     */
    const rubrosManualesAntes = this.egresos
      .filter(x =>
        this.esRubroManualEditable(x) &&
        this.toNumber(x.cantidad) === 1
      )
      .map(x => ({
        idIngDesc: x.idIngDesc,
        cantidad: 1,
        valor: this.toNumber(x.valor)
      }));

    if (!this.validarRubrosNoNegativosAntesDeGuardar()) {
      return;
    }

    if (!this.validarAusenciasAntesDeGuardar()) {
      return;
    }

    if (!this.calcular()) {
      return;
    }

    /*
     * Restaurar rubros manuales activos.
     *
     * Si Cant/% = 1, se conserva el valor digitado.
     */
    if (rubrosManualesAntes.length > 0) {
      this.egresos = this.egresos.map(x => {
        const manual = rubrosManualesAntes.find(m => m.idIngDesc === x.idIngDesc);

        if (manual) {
          return {
            ...x,
            cantidad: manual.cantidad,
            valor: manual.valor
          };
        }

        return x;
      });
    }

    /*
     * Para rubros manuales NO activos:
     * Cant/% != 1
     * Se restaura el valor automático original del empleado.
     *
     * Ejemplo:
     * ANTICIPO I QUINCENA = 480
     */
    this.egresos = this.egresos.map(x => {
      if (
        this.esRubroManualEditable(x) &&
        this.toNumber(x.cantidad) !== 1
      ) {
        return {
          ...x,
          valor: this.obtenerValorAutomaticoRubroManual(x)
        };
      }

      return x;
    });

    this.recalcularTotales();

    if (!this.validarLiquidoRecibir()) {
      return;
    }

    const payload: GuardarRolIndividualRequest = {
      idEmpleado: this.dataRol.idEmpleado,
      fechaPeriodo: this.dataRol.fechaPeriodo,
      idUsuario: this.usuarioActual?.id_usuario ?? 1,
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
  const diasBaseNomina = 30;

  const diasBasePeriodo = this.diasTrabajadosBasePeriodo > 0
    ? this.diasTrabajadosBasePeriodo
    : 30;

  const diasAusencia = this.obtenerDiasAusencias();

  const diasTrabajados = Math.max(
    diasBasePeriodo - diasAusencia,
    0
  );

  const rubroDiasTrabajados = this.ingresos.find(x =>
    this.esRubroDiasTrabajados(x)
  );

  if (rubroDiasTrabajados) {
    rubroDiasTrabajados.cantidad = diasTrabajados;
    rubroDiasTrabajados.valor = this.redondear(
      (sueldo / diasBaseNomina) * diasTrabajados
    );
  }
}
private guardarDiasTrabajadosBasePeriodo(): void {
  /*
   * La base del periodo debe salir de las fechas del empleado,
   * usando mes comercial de 30 días.
   *
   * Si el empleado trabajó todo febrero:
   * base = 30
   *
   * Si tuvo salida el 01/06:
   * base = 1
   *
   * Si ingresó el 16/02:
   * base = 15
   */
  this.diasTrabajadosBasePeriodo = this.calcularDiasBaseNominaEmpleado();

  const rubroDiasTrabajados = this.ingresos.find(x =>
    this.esRubroDiasTrabajados(x)
  );

  this.valorDiasTrabajadosBasePeriodo = rubroDiasTrabajados
    ? this.toNumber(rubroDiasTrabajados.valor)
    : this.toNumber(this.dataRol?.sueldo);
}
private recalcularAporteIess(): void {
  const porcentajeIess = this.toNumber(
    this.dataRol?.porcentajeIessPersonal || 9.45
  );

  /*
   * Regla:
   *
   * 1. Si hay PERMISO MATERNIDAD:
   *    El IESS se calcula sobre el SUELDO completo.
   *
   *    Ejemplo:
   *    Sueldo = 890.00
   *    IESS = 890.00 * 9.45% = 84.11
   *
   * 2. Si NO hay maternidad:
   *    El IESS se calcula sobre ingresos reales aportables,
   *    excluyendo SUELDO porque es referencial.
   */
  const hayMaternidad = this.ingresos.some(x =>
    this.esRubroPermisoMaternidad(x) &&
    this.toNumber(x.cantidad) > 0
  );

  let baseIess = 0;

  if (hayMaternidad) {
    baseIess = this.toNumber(this.dataRol?.sueldo);

    /*
     * Si además tiene otros ingresos aportables reales,
     * como horas extras, bono, retroactivo, etc.,
     * se suman aparte.
     *
     * No se suma:
     * - SUELDO, porque ya se tomó desde dataRol.sueldo.
     * - DIAS TRABAJADOS, porque en maternidad puede estar 0.
     * - PERMISO MATERNIDAD, porque no es la base del IESS en este caso.
     * - Fondo reserva / décimos / enfermedad / accidente.
     */
    const otrosIngresosAportables = this.ingresos
      .filter(x => x.tipoPago === 'I')
      .filter(x => x.aportaIess === true)
      .filter(x => !this.esRubroSueldo(x))
      .filter(x => !this.esRubroDiasTrabajados(x))
      .filter(x => !this.esRubroPermisoMaternidad(x))
      .filter(x => !this.esRubroFondoReserva(x))
      .filter(x => !this.esRubroDecimoTercero(x))
      .filter(x => !this.esRubroEnfermedad(x))
      .filter(x => !this.esRubroAccidenteTrabajo(x))
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

    baseIess += otrosIngresosAportables;
  } else {
    baseIess = this.ingresos
      .filter(x => x.tipoPago === 'I')
      .filter(x => x.aportaIess === true)
      .filter(x => !this.esRubroSueldo(x))
      .filter(x => !this.esRubroFondoReserva(x))
      .filter(x => !this.esRubroDecimoTercero(x))
      .filter(x => !this.esRubroEnfermedad(x))
      .filter(x => !this.esRubroAccidenteTrabajo(x))
      .reduce((acc, item) => acc + this.toNumber(item.valor), 0);
  }

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

  /*
   * Fondo de reserva debe tomar ingresos reales.
   * SUELDO se excluye porque es referencial.
   * DIAS TRABAJADOS queda como base real.
   */
  const baseFondoReserva = this.ingresos
    .filter(x => x.tipoPago === 'I')
    .filter(x => x.aplicaFondoReserva === true)
    .filter(x => !this.esRubroSueldo(x))
    .filter(x => !this.esRubroPermisoMaternidad(x))
    .filter(x => !this.esRubroFondoReserva(x))
    .filter(x => !this.esRubroDecimoTercero(x))
    .filter(x => !this.esRubroEnfermedad(x))
    .filter(x => !this.esRubroAccidenteTrabajo(x))
    .reduce((acc, item) => acc + this.toNumber(item.valor), 0);

  rubroFondoReserva.valor = this.redondear(
    baseFondoReserva * porcentajeFondoReserva / 100
  );

  rubroFondoReserva.cantidad = 0;
} 
 private recalcularDecimoTercero(): void {
  /*
   * Décimo tercero debe tomar ingresos reales.
   * SUELDO se excluye porque es referencial.
   * DIAS TRABAJADOS queda como base real.
   */
  const baseDecimoTercero = this.ingresos
    .filter(x => x.tipoPago === 'I')
    .filter(x => x.aplicaDecimoTercero === true)
    .filter(x => !this.esRubroSueldo(x))
    .filter(x => !this.esRubroPermisoMaternidad(x))
    .filter(x => !this.esRubroFondoReserva(x))
    .filter(x => !this.esRubroDecimoTercero(x))
    .filter(x => !this.esRubroEnfermedad(x))
    .filter(x => !this.esRubroAccidenteTrabajo(x))
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
  private esRubroAnticipoQuincena(row: RolIndividualRubroResponse): boolean {
    const descripcion = (row.descripcion ?? '').toString().trim().toUpperCase();
    const codigo = this.normalizarCodigo(row.codigo);

    return row.tipoPago === 'D' &&
      row.idIngDesc === 2 &&
      codigo === '02' &&
      descripcion.includes('ANTICIPO') &&
      descripcion.includes('QUINCENA');
  }

  private esRubroManualEditable(row: RolIndividualRubroResponse): boolean {
    return this.esRubroImpuestoRenta(row) ||
      this.esRubroAnticipoQuincena(row);
  }

  private esRubroManualActivo(row: RolIndividualRubroResponse): boolean {
    return this.esRubroManualEditable(row) &&
      this.toNumber(row.cantidad) === 1;
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
  private esImpuestoRentaManual(row: RolIndividualRubroResponse): boolean {
    return this.esRubroImpuestoRenta(row) &&
      this.esRubroManualActivo(row);
  }
  calcularDesdeBackend(): void {
    if (!this.dataRol) {
      this.mostrarAdvertencia('No existe información del rol individual.');
      return;
    }

    const rubrosManualesAntes = this.egresos
      .filter(x =>
        this.esRubroManualEditable(x) &&
        this.toNumber(x.cantidad) === 1
      )
      .map(x => ({
        idIngDesc: x.idIngDesc,
        cantidad: 1,
        valor: this.toNumber(x.valor)
      }));

    if (!this.validarRubrosNoNegativosAntesDeGuardar()) {
      return;
    }

    if (!this.validarAusenciasAntesDeGuardar()) {
      return;
    }

    if (!this.calcular()) {
      return;
    }

    if (rubrosManualesAntes.length > 0) {
      this.egresos = this.egresos.map(x => {
        const manual = rubrosManualesAntes.find(m => m.idIngDesc === x.idIngDesc);

        if (manual) {
          return {
            ...x,
            cantidad: manual.cantidad,
            valor: manual.valor
          };
        }

        return x;
      });

      this.recalcularTotales();
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

          this.mostrarMensajePorTipo(
            resp.type,
            'Cálculo actualizado correctamente.'
          );

          this.cargarRolIndividual();
        },
        error: err => {
          this.guardando = false;
          console.error(err);
          this.mostrarError('Error al calcular el rol individual.');
        }
      });
  }
  private confirmarAccion(
    titulo: string,
    mensaje: string,
    textoConfirmar: string = 'Sí, confirmar',
    textoCancelar: string = 'Cancelar'
  ) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      disableClose: true,
      data: {
        title: titulo,
        message: mensaje,
        type: 'info',
        confirmText: textoConfirmar,
        cancelText: textoCancelar,
        showCancel: true
      }
    }).afterClosed();
  }
  private guardarValoresAutomaticosRubrosManuales(): void {
    this.valoresAutomaticosRubrosManuales.clear();

    this.egresos
      .filter(x => this.esRubroManualEditable(x))
      .forEach(x => {
        this.valoresAutomaticosRubrosManuales.set(
          x.idIngDesc,
          this.toNumber(x.valor)
        );
      });
  }

  private obtenerValorAutomaticoRubroManual(row: RolIndividualRubroResponse): number {
    if (this.esRubroAnticipoQuincena(row)) {
      return this.toNumber(this.dataRol?.anticipoQuincenaEmpleado);
    }

    return this.valoresAutomaticosRubrosManuales.get(row.idIngDesc) ?? 0;
  }
  private aplicarValorAutomaticoAnticipoQuincena(): void {
    const valorQuincena = this.toNumber(this.dataRol?.anticipoQuincenaEmpleado);

    this.egresos = this.egresos.map(x => {
      if (
        this.esRubroAnticipoQuincena(x) &&
        this.toNumber(x.cantidad) !== 1
      ) {
        return {
          ...x,
          valor: valorQuincena
        };
      }

      return x;
    });
  }
private obtenerDiasBasePeriodo(): number {
  /*
   * La nómina trabaja con mes comercial.
   * Todos los meses tienen base 30, incluido febrero.
   */
  return 30;
}
private calcularDiasBaseNominaEmpleado(): number {
  const fechaPeriodoTexto =
    (this.dataRol?.fechaPeriodo ?? this.data?.fechaPeriodo ?? '')
      .toString()
      .substring(0, 10);

  if (!fechaPeriodoTexto) {
    return 30;
  }

  const partesPeriodo = fechaPeriodoTexto.split('-');

  if (partesPeriodo.length !== 3) {
    return 30;
  }

  const anio = Number(partesPeriodo[0]);
  const mes = Number(partesPeriodo[1]);

  if (!anio || !mes) {
    return 30;
  }

  const inicioPeriodo = new Date(anio, mes - 1, 1);
  const ultimoDiaCalendario = new Date(anio, mes, 0).getDate();
  const finPeriodo = new Date(anio, mes - 1, ultimoDiaCalendario);

  const fechaIngreso = this.parsearFechaDateOnly(this.dataRol?.fechaIngreso);
  const fechaSalida = this.parsearFechaDateOnly(this.dataRol?.fechaSalida);

  if (fechaIngreso && fechaIngreso > finPeriodo) {
    return 0;
  }

  if (fechaSalida && fechaSalida < inicioPeriodo) {
    return 0;
  }

  let diaInicioNomina = 1;
  let diaFinNomina = 30;

  if (
    fechaIngreso &&
    fechaIngreso.getFullYear() === anio &&
    fechaIngreso.getMonth() === mes - 1
  ) {
    diaInicioNomina = this.convertirDiaCalendarioADiaNomina(
      fechaIngreso.getDate(),
      ultimoDiaCalendario
    );
  }

  if (
    fechaSalida &&
    fechaSalida.getFullYear() === anio &&
    fechaSalida.getMonth() === mes - 1
  ) {
    diaFinNomina = this.convertirDiaCalendarioADiaNomina(
      fechaSalida.getDate(),
      ultimoDiaCalendario
    );
  }

  const dias = diaFinNomina - diaInicioNomina + 1;

  if (dias < 0) {
    return 0;
  }

  if (dias > 30) {
    return 30;
  }

  return dias;
}

private convertirDiaCalendarioADiaNomina(
  diaCalendario: number,
  ultimoDiaCalendario: number
): number {
  /*
   * En febrero, el último día calendario equivale al día 30 de nómina.
   * Ejemplo:
   * 28/02 => día nómina 30
   * 29/02 => día nómina 30
   */
  if (diaCalendario === ultimoDiaCalendario) {
    return 30;
  }

  if (diaCalendario > 30) {
    return 30;
  }

  return diaCalendario;
}

private parsearFechaDateOnly(fecha: string | null | undefined): Date | null {
  if (!fecha || fecha === 'N/D') {
    return null;
  }

  const texto = fecha.toString().substring(0, 10);
  const partes = texto.split('-');

  if (partes.length !== 3) {
    return null;
  }

  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  if (!anio || !mes || !dia) {
    return null;
  }

  return new Date(anio, mes - 1, dia);
}
}