import { Component, OnInit } from '@angular/core';
import { DialogProcesoComponent } from 'src/app/components/productos/dialog-proceso/dialog-proceso.component';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { UsuarioService } from 'src/app/services/usuario.service';
import { DialogBancoNominaComponent, DialogBancoNominaData, DialogBancoNominaResult } from '../dialog-banco-nomina/dialog-banco-nomina.component';
import {
  ColDef,
  ColGroupDef,
  ValueFormatterParams,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { RolIndividualDialogComponent } from '../rol-individual-dialog/rol-individual-dialog.component';
import { LocalesService } from 'src/app/services/locales.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import {
  CierrePeriodoService,
  ValidarCierrePeriodoRequest
} from 'src/app/services/rol/cierre-periodo.service';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

import {
  GenerarRolMensualRequest,
  RolMensualRequest,
  RolMensualResponse,
  RubroColumnaResponse,
  RolNominaService,
  RecalcularRolMensualRequest,
  EnviarRolesCorreoRequest
} from 'src/app/services/rol/rol-nomina.service';

interface NodoRol {
  id: number | null;
  nombre: string;
  tipo: 'GENERAL' | 'LOCAL' | 'DEPARTAMENTO';
  expandido?: boolean;
  hijos?: NodoRol[];
}

export const DD_MM_YYYY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (!date) {
      return '';
    }

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }
}

@Component({
  selector: 'app-rol-mensual',
  templateUrl: './rol-mensual.component.html',
  styleUrls: ['./rol-mensual.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS }
  ]
})
export class RolMensualComponent implements OnInit {
  form!: FormGroup;

  nodos: NodoRol[] = [];
  nodoSeleccionado: NodoRol | null = null;
  procesandoModificar = false;
  modificarBloqueado = false;
  actualizando = false;
  exportandoExcel = false;
  usuarioActual = this.usuarioService.getUsuarioActual();
  /*
   * Este arreglo alimenta el AG Grid.
   * Ahora es dinámico porque cada fila tiene:
   * - datos base
   * - rubros: Record<string, number>
   */
  detalleRol: any[] = [];
  empleadosSeleccionados = new Set<number>();
  todosSeleccionados = false;
  private gridApi!: GridApi;
  /*
   * Columnas dinámicas que vienen del backend:
   * rol.ingreso_descuentos where incluir = 1
   */
  columnasRubros: RubroColumnaResponse[] = [];

  generando = false;
  cargando = false;

  columnDefs: Array<ColDef | ColGroupDef> = [];

  pinnedBottomRowData: any[] = [];
  periodoCerrado = false;
  validandoCierre = false;
  periodoExiste = false;
  modoEdicionPeriodo = false;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  constructor(
    private fb: FormBuilder,
    private rolNominaService: RolNominaService,
    private dialog: MatDialog,
    private localesService: LocalesService,
    private snackBar: MatSnackBar,
    private cierrePeriodoService: CierrePeriodoService,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      verLocales: [true],
      areas: [true],
      exEmpleados: [true],
      departamentos: [false],

      fechaPeriodo: [
        this.obtenerUltimoDiaMesActual(),
        [Validators.required, this.validarUltimoDiaMes]
      ],

      totalizados: [false],
      porRubros: [false],
      todosLosRubros: [true],
      totalizar: [false]
    });

    this.form.get('departamentos')?.valueChanges.subscribe(() => {
      this.nodoSeleccionado = null;
      this.cargarInicial();
    });

    this.cargarInicial();
  }

  cargarInicial(): void {
    this.nodos = [
      {
        id: null,
        nombre: 'Emisión de Roles',
        tipo: 'GENERAL',
        expandido: false,
        hijos: []
      }
    ];

    this.nodoSeleccionado = this.nodos[0];
    this.detalleRol = [];
    this.columnDefs = this.construirColumnasGrid([]);

    this.cargarLocalesArbol();

    // NO cargar aquí el rol mensual.
    // this.cargarRolMensual();
  }

  seleccionarNodo(nodo: NodoRol): void {
    this.nodoSeleccionado = nodo;
    this.cargarRolMensual();
  }
  toggleNodo(nodo: NodoRol, event: MouseEvent): void {
    event.stopPropagation();
    nodo.expandido = !nodo.expandido;
  }

  nuevo(): void {
    if (!this.form.value.fechaPeriodo) {
      this.mostrarAdvertencia('Debe ingresar el periodo.');
      return;
    }

    const fechaPeriodo = this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo);

    const requestCierre: ValidarCierrePeriodoRequest = {
      fecha: fechaPeriodo
    };

    this.validandoCierre = true;

    this.cierrePeriodoService.validar(requestCierre).subscribe({
      next: (resp) => {
        this.validandoCierre = false;

        if (resp.type !== 'Success') {
          this.mostrarError(resp.message ?? 'No se pudo validar el cierre del periodo.');
          return;
        }

        if (resp.data?.existe === true) {
          this.periodoCerrado = true;

          this.mostrarAdvertencia(
            'El periodo ya se encuentra cerrado. Solo se cargará la información, no se permite modificar la nómina.'
          );

          this.cargarRolMensual();
          return;
        }

        this.periodoCerrado = false;
        this.generarRolMensualNuevo();
      },
      error: (err) => {
        this.validandoCierre = false;
        console.error('Error validando cierre de periodo:', err);
        this.mostrarError('Error al validar si el periodo está cerrado.');
      }
    });
  }

  private generarSobrescribiendo(): void {
    if (this.periodoCerrado) {
      this.mostrarAdvertencia(
        'El periodo está cerrado. No se puede sobrescribir la nómina.'
      );
      this.cargarRolMensual();
      return;
    }

    if (this.procesandoModificar || this.modificarBloqueado) {
      return;
    }

    const request = this.construirRequestGenerar(true);

    this.generando = true;
    this.procesandoModificar = true;

    this.rolNominaService.generarRolMensual(request).subscribe({
      next: (resp) => {
        if (resp.type === 'Success') {
          this.mostrarExito(resp.message ?? 'Nómina modificada correctamente.');

          this.periodoExiste = true;
          this.modoEdicionPeriodo = true;

          /*
           * Aquí queda bloqueado después de terminar bien.
           */
          this.modificarBloqueado = true;

          this.cargarRolMensual();
          return;
        }

        /*
         * Si no fue éxito, se vuelve a permitir modificar.
         */
        this.modificarBloqueado = false;

        this.mostrarAdvertencia(resp.message ?? 'No se pudo modificar la nómina.');
      },
      error: (err) => {
        console.error('Error al modificar nómina:', err);

        /*
         * Si falla, se vuelve a habilitar.
         */
        this.modificarBloqueado = false;

        this.mostrarError('Error al modificar la nómina mensual.');
      },
      complete: () => {
        /*
         * Ya no debe mostrar Procesando...
         * Pero si fue éxito, modificarBloqueado queda true.
         */
        this.generando = false;
        this.procesandoModificar = false;
      }
    });
  }
  actualizar(): void {
    if (!this.form.value.fechaPeriodo) {
      this.mostrarAdvertencia('Debe ingresar el periodo.');
      return;
    }

    if (this.periodoCerrado) {
      this.mostrarAdvertencia(
        'El periodo está cerrado. No se puede actualizar ni modificar la nómina.'
      );
      this.cargarRolMensual();
      return;
    }

    this.confirmarAccion(
      'Actualizar rol mensual',
      'Se volverá a generar la nómina del periodo seleccionado y se sobrescribirá la información existente. ¿Desea continuar?',
      'Sí, actualizar',
      'Cancelar'
    ).subscribe((confirmado: boolean) => {
      if (confirmado !== true) {
        return;
      }

      this.generarSobrescribiendo();
    });
  }
  cargarHoras(): void {
    if (this.periodoCerrado) {
      this.mostrarAdvertencia('El periodo está cerrado. No puede cargar horas.');
      return;
    }

    if (!this.periodoExiste) {
      this.mostrarAdvertencia('Debe crear o consultar el periodo antes de cargar horas.');
      return;
    }

    // lógica actual...
  }
  rubrosFijos(): void {
    if (this.periodoCerrado) {
      this.mostrarAdvertencia('El periodo está cerrado. No puede modificar rubros fijos.');
      return;
    }

    if (!this.periodoExiste) {
      this.mostrarAdvertencia('Debe crear o consultar el periodo antes de cargar rubros fijos.');
      return;
    }

    // lógica actual...
  }

  cancelar(): void {
    this.detalleRol = [];
    this.columnasRubros = [];
    this.columnDefs = this.construirColumnasGrid([]);
    this.pinnedBottomRowData = [];

    /*
     * IMPORTANTE:
     * No limpiar nodos, porque eso quita "Emisión de Roles".
     */
    // this.nodos = [];
    // this.nodoSeleccionado = null;

    const nodoRaiz = this.nodos.find(x =>
      x.nombre === 'Emisión de Roles' ||
      x.tipo === 'GENERAL'
    );

    if (nodoRaiz) {
      nodoRaiz.expandido = false;
      this.nodoSeleccionado = nodoRaiz;
    }

    this.periodoCerrado = false;
    this.periodoExiste = false;
    this.modoEdicionPeriodo = false;
    this.validandoCierre = false;

    this.generando = false;
    this.cargando = false;
    this.actualizando = false;
    this.procesandoModificar = false;
    this.modificarBloqueado = false;
    this.enviandoCorreos = false;

    if (this.gridApi) {
      this.gridApi.deselectAll();
      this.gridApi.refreshCells({ force: true });
    }

    this.mostrarAdvertencia('Operación cancelada.');
  }
  cargarRolMensual(): void {
    if (!this.form.value.fechaPeriodo) {
      this.mostrarAdvertencia('Debe ingresar el periodo.');
      return;
    }

    this.validarEstadoCierrePeriodo();

    const request = this.construirRequestConsulta();

    this.cargando = true;

    this.rolNominaService.getRolMensual(request).subscribe({
      next: (resp) => {
        this.cargando = false;

        if (resp.type !== 'Success') {
          this.mostrarAdvertencia(resp.message ?? 'No se pudo cargar el rol mensual.');

          this.detalleRol = [];
          this.columnasRubros = [];
          this.columnDefs = this.construirColumnasGrid([]);
          this.pinnedBottomRowData = [];

          /*
           * Si no cargó datos correctamente, asumimos que no hay periodo válido cargado.
           */
          this.periodoExiste = false;
          this.modoEdicionPeriodo = false;

          return;
        }

        const data = resp.data as RolMensualResponse;

        this.columnasRubros = data.columnasRubros ?? [];
        this.columnDefs = this.construirColumnasGrid(this.columnasRubros);

        this.detalleRol = (data.empleados ?? []).map(e => ({
          idEmpleado: e.idEmpleado,
          codigoEmpleado: e.codigoEmpleado,
          nombreEmpleado: e.nombreEmpleado,

          // SOLO PARA EXCEL
          cedula: e.cedula ?? '',
          cargo: e.cargo ?? '',

          estado: e.estado ?? '',
          idLocal: e.idLocal,
          local: e.local ?? '',

          diasTrabajados: e.diasTrabajados ?? 0,
          rubros: e.rubros ?? {},
          totalIngresos: e.totalIngresos ?? 0,
          totalDescuentos: e.totalDescuentos ?? 0,
          liquidoRecibir: e.liquidoRecibir ?? 0
        }));

        this.pinnedBottomRowData = this.detalleRol.length > 0
          ? [this.construirFilaTotales()]
          : [];

        /*
         * Estas dos líneas son las importantes.
         *
         * Si hay empleados en el grid, el periodo ya existe.
         * Si existe y no está cerrado, queda habilitado para modificación.
         */
        this.periodoExiste = this.detalleRol.length > 0;
        this.modoEdicionPeriodo = this.periodoExiste && !this.periodoCerrado;
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error cargando rol mensual:', err);

        this.mostrarError('Error al cargar el rol mensual.');

        this.detalleRol = [];
        this.columnasRubros = [];
        this.columnDefs = this.construirColumnasGrid([]);
        this.pinnedBottomRowData = [];

        this.periodoExiste = false;
        this.modoEdicionPeriodo = false;
      }
    });
  }

  private construirColumnasGrid(columnasRubros: RubroColumnaResponse[]): Array<ColDef | ColGroupDef> {
    const columnaSeleccion: ColDef = {
      headerName: '',
      colId: 'seleccion',
      width: 46,
      minWidth: 46,
      maxWidth: 46,
      pinned: 'left',
      lockPinned: true,
      lockPosition: true,
      sortable: false,
      filter: false,
      resizable: false,
      suppressSizeToFit: true,
      checkboxSelection: params => !params.node?.rowPinned,
      headerCheckboxSelection: true,
      cellClass: 'cell-check-rol',
      headerClass: 'header-check-rol'
    };
    const columnaNombre: ColDef = {
      headerName: 'Nombre',
      field: 'nombreEmpleado',
      width: 230,
      minWidth: 230,
      pinned: 'left',
      lockPinned: true,
      suppressSizeToFit: true,
      filter: true
    };

    const columnaCodigo: ColDef = {
      headerName: 'Código',
      field: 'codigoEmpleado',
      width: 80,
      minWidth: 80,
      maxWidth: 90,
      pinned: 'left',
      lockPinned: true,
      suppressSizeToFit: true,
      filter: true
    };

    let columnasIngresos: Array<ColDef | ColGroupDef> = columnasRubros
      .filter(x => x.tipoPago === 'I')
      .map(col => this.construirColumnaRubroFlexible(col, 'INGRESO'));

    columnasIngresos = this.ordenarColumnasIngresosConDias(columnasIngresos);

    const columnasDescuentos: Array<ColDef | ColGroupDef> = columnasRubros
      .filter(x => x.tipoPago === 'D')
      .map(col => this.construirColumnaRubroFlexible(col, 'DESCUENTO'));

    const grupoIngresos: ColGroupDef = {
      headerName: 'INGRESOS',
      headerClass: 'grupo-ingresos',
      marryChildren: true,
      children: columnasIngresos
    };

    const grupoDescuentos: ColGroupDef = {
      headerName: 'DESCUENTOS',
      headerClass: 'grupo-descuentos',
      marryChildren: true,
      children: columnasDescuentos
    };

    const columnasTotales: ColDef[] = [
      {
        field: 'totalIngresos',
        headerName: 'Total Ingresos',
        width: 150,
        type: 'numericColumn',
        pinned: 'right',
        headerClass: 'header-total-ingresos',
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-total-ingresos'
            : 'cell-total-ingresos',
        cellStyle: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          fontWeight: '800'
        },
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimalValor(params.value)
      },
      {
        field: 'totalDescuentos',
        headerName: 'Total Descuentos',
        width: 165,
        type: 'numericColumn',
        pinned: 'right',
        headerClass: 'header-total-descuentos',
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-total-descuentos'
            : 'cell-total-descuentos',
        cellStyle: {
          backgroundColor: '#fef9c3',
          color: '#854d0e',
          fontWeight: '800'
        },
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimalValor(params.value)
      },
      {
        field: 'liquidoRecibir',
        headerName: 'Líquido a Recibir',
        width: 170,
        type: 'numericColumn',
        pinned: 'right',
        headerClass: 'header-total-liquido',
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-total-row cell-total-liquido'
            : 'cell-total-liquido',
        cellStyle: {
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
          fontWeight: '900'
        },
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimalValor(params.value)
      }
    ];

    return [
      columnaSeleccion,
      columnaCodigo,
      columnaNombre,
      grupoIngresos,
      grupoDescuentos,
      ...columnasTotales
    ];


  }

  private obtenerNombreColumnaRubro(col: RubroColumnaResponse): string {
    const descripcion = (col.descripcion ?? '').trim();

    if (descripcion.length > 0) {
      return descripcion;
    }

    return `${col.tipoPago}-${col.codigo}`;
  }

  private obtenerAnchoColumnaRubro(col: RubroColumnaResponse): number {
    const nombre = this.obtenerNombreColumnaRubro(col);

    if (nombre.length <= 8) {
      return 110;
    }

    if (nombre.length <= 16) {
      return 135;
    }

    return 160;
  }

  private obtenerKeyRubro(col: RubroColumnaResponse): string {
    /*
     * Importante:
     * El backend arma ColumnaKey como Codigo + TipoPago.
     * Ejemplo:
     * I-2  => 2I
     * D-25 => 25D
     *
     * No normalizo a 02I porque puede no coincidir con el Dictionary.
     */
    if (col.columnaKey) {
      return col.columnaKey;
    }

    return `${col.codigo}${col.tipoPago}`;
  }

  /*
   * Mantiene compatibilidad con las tarjetas existentes del HTML.
   * Aunque el grid sea dinámico, tu HTML todavía llama:
   * calcularTotal('sueldo'), calcularTotal('diasTrabajados'), etc.
   */
  calcularTotal(campo: string): number {
    if (!this.detalleRol || this.detalleRol.length === 0) {
      return 0;
    }

    const mapaRubros: Record<string, string> = {
      diasTrabajados: '2I',
      sueldo: '3I',
      maternidad: '4I',
      recargoNocturno: '7I',
      horasExtras25: '8I',
      horasExtras50: '9I',
      horasExtras100: '10I',
      aporteIess: '25D',
      fondoReserva: '18I',
      decimoTercero: '46I',
      decimoCuarto: '45I'
    };

    if (campo === 'totalIngresos') {
      return this.detalleRol.reduce(
        (acc, item) => acc + this.toNumber(item.totalIngresos),
        0
      );
    }

    if (campo === 'totalDescuentos') {
      return this.detalleRol.reduce(
        (acc, item) => acc + this.toNumber(item.totalDescuentos),
        0
      );
    }

    if (campo === 'liquidoRecibir') {
      return this.detalleRol.reduce(
        (acc, item) => acc + this.toNumber(item.liquidoRecibir),
        0
      );
    }

    const key = mapaRubros[campo];

    if (key) {
      return this.detalleRol.reduce((acc, item) => {
        const rubros = item.rubros ?? {};
        return acc + this.toNumber(rubros[key]);
      }, 0);
    }

    return this.detalleRol.reduce(
      (acc, item) => acc + this.toNumber(item[campo]),
      0
    );
  }
  abrirRolIndividual(event: any): void {
    const empleado = event?.data;

    if (!empleado) {
      this.mostrarAdvertencia('No se encontró información del empleado.');
      return;
    }

    if (!this.form.value.fechaPeriodo) {
      this.mostrarAdvertencia('Debe seleccionar un periodo.');
      return;
    }

    /*
     * Si el periodo está cerrado:
     * No se permite modificar.
     * Se descarga la impresión del rol individual.
     */
    if (this.periodoCerrado) {
      this.descargarImpresionRolIndividual(empleado);
      return;
    }

    /*
     * Si el periodo está abierto:
     * Permite modificar únicamente si está habilitado el modo edición.
     */
    if (!this.modoEdicionPeriodo) {
      this.mostrarAdvertencia('Debe habilitar el periodo en modo modificación.');
      return;
    }

    const dialogRef = this.dialog.open(RolIndividualDialogComponent, {
      width: '95vw',
      maxWidth: '1400px',
      disableClose: true,
      data: {
        idEmpleado: empleado.idEmpleado,
        fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo)
      }
    });

    dialogRef.afterClosed().subscribe(actualizo => {
      if (actualizo === true && !this.periodoCerrado) {
        this.cargarRolMensual();
      }
    });
  }

  private construirRequestGenerar(sobrescribir: boolean): GenerarRolMensualRequest {
    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    return {
      fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),

      idLocal: tipoNodo === 'LOCAL'
        ? this.nodoSeleccionado!.id
        : null,

      idDepartamento: tipoNodo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado!.id
        : null,

      verLocales: this.form.value.verLocales ?? true,
      areas: this.form.value.areas ?? true,
      exEmpleados: this.form.value.exEmpleados ?? true,

      /*
       * Evita error FK si no tienes usuario real de sesión.
       * Cuando tengas login, coloca aquí el id_usuario válido.
       */
      idUsuario: null,

      sobrescribir
    };
  }
  private construirRequestConsulta(): RolMensualRequest {
    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    return {
      fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),

      idLocal: tipoNodo === 'LOCAL'
        ? this.nodoSeleccionado!.id
        : null,

      idDepartamento: tipoNodo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado!.id
        : null,

      verLocales: tipoNodo === 'GENERAL',
      areas: this.form.value.areas ?? true,
      exEmpleados: this.form.value.exEmpleados ?? true,

      departamentos: this.form.value.departamentos ?? false,

      /*
       * IMPORTANTE:
       * Para que aparezca D-06 IMPUESTO A LA RENTA,
       * la consulta debe traer los rubros.
       */
      totalizados: false,
      porRubros: true,
      todosLosRubros: true,
      totalizar: true
    };
  }
  private cargarLocalesArbol(): void {
    this.localesService.getAll().subscribe({
      next: (response) => {
        const locales = response.data ?? [];

        const raiz = this.nodos[0];

        raiz.hijos = locales.map((local: any) => ({
          id: Number(local.id),
          nombre: local.nombre ?? `Local ${local.id}`,
          tipo: 'LOCAL' as const,
          expandido: false,
          hijos: []
        }));
      },
      error: (err) => {
        console.error('Error cargando locales:', err);
        this.mostrarError('No se pudieron cargar los locales.');
      }
    });
  }

  private obtenerUltimoDiaMesActual(): Date {
    const hoy = new Date();

    return new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0
    );
  }

  validarUltimoDiaMes(control: AbstractControl): ValidationErrors | null {
    const fecha = control.value;

    if (!fecha) {
      return null;
    }

    const date = fecha instanceof Date
      ? fecha
      : new Date(fecha);

    if (isNaN(date.getTime())) {
      return { fechaInvalida: true };
    }

    const ultimoDia = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();

    return date.getDate() === ultimoDia
      ? null
      : { fechaInvalida: true };
  }

  soloUltimoDiaMes = (fecha: Date | null): boolean => {
    if (!fecha) {
      return false;
    }

    const ultimoDia = new Date(
      fecha.getFullYear(),
      fecha.getMonth() + 1,
      0
    ).getDate();

    return fecha.getDate() === ultimoDia;
  };

  private formatearFechaYYYYMMDD(value: any): string {
    if (!value) {
      return '';
    }

    /*
     * No usar toISOString(), porque puede restar un día
     * por zona horaria.
     */
    if (typeof value === 'string') {
      if (value.includes('/')) {
        const partes = value.split('/');

        if (partes.length === 3) {
          const dia = partes[0].padStart(2, '0');
          const mes = partes[1].padStart(2, '0');
          const anio = partes[2];

          return `${anio}-${mes}-${dia}`;
        }
      }

      return value.substring(0, 10);
    }

    const fecha = value as Date;

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const n = Number(value);

    return isNaN(n) ? 0 : n;
  }

  /*
   * Formatter para AG Grid cuando recibe params.
   */
  private formatearDecimal(params: any): string {
    if (!params || params.value === null || params.value === undefined) {
      return '';
    }

    return this.formatearDecimalValor(params.value);
  }

  /*
   * Formatter general para valores.
   */
  private formatearDecimalValor(value: any): string {
    const n = this.toNumber(value);

    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
  private construirColumnaRubro(
    col: RubroColumnaResponse,
    tipo: 'INGRESO' | 'DESCUENTO'
  ): ColDef {
    const key = this.obtenerKeyRubro(col);
    const esIngreso = tipo === 'INGRESO';

    return {
      headerName: this.obtenerNombreColumnaRubro(col),
      colId: key,
      width: this.obtenerAnchoColumnaRubro(col),
      type: 'numericColumn',
      filter: true,

      headerClass: esIngreso
        ? 'header-ingreso'
        : 'header-descuento',

      cellClass: params => {
        const claseBase = esIngreso
          ? 'cell-ingreso'
          : 'cell-descuento';

        return params.node?.rowPinned
          ? `${claseBase} cell-total-row`
          : claseBase;
      },

      cellStyle: esIngreso
        ? {
          backgroundColor: '#f0fdf4',
          color: '#065f46',
          fontWeight: '600'
        }
        : {
          backgroundColor: '#fefce8',
          color: '#854d0e',
          fontWeight: '600'
        },

      valueGetter: params => {
        const rubros = params.data?.rubros ?? {};
        return this.toNumber(rubros[key]);
      },

      valueFormatter: (params: ValueFormatterParams) =>
        this.formatearDecimalValor(params.value)
    };
  }
  private construirFilaTotales(): any {
    const rubrosTotales: Record<string, number> = {};

    this.columnasRubros.forEach(col => {
      const key = this.obtenerKeyRubro(col);
      const keyCantidad = `${key}_CANT`;

      rubrosTotales[key] = this.detalleRol.reduce((acc, item) => {
        const rubros = item.rubros ?? {};
        return acc + this.toNumber(rubros[key]);
      }, 0);

      rubrosTotales[keyCantidad] = this.detalleRol.reduce((acc, item) => {
        const rubros = item.rubros ?? {};
        return acc + this.toNumber(rubros[keyCantidad]);
      }, 0);
    });



    const totalIngresos = this.detalleRol.reduce(
      (acc, item) => acc + this.toNumber(item.totalIngresos),
      0
    );

    const totalDescuentos = this.detalleRol.reduce(
      (acc, item) => acc + this.toNumber(item.totalDescuentos),
      0
    );

    const liquidoRecibir = this.detalleRol.reduce(
      (acc, item) => acc + this.toNumber(item.liquidoRecibir),
      0
    );

    return {
      idEmpleado: null,
      codigoEmpleado: '',
      nombreEmpleado: 'TOTALES',
      estado: '',
      idLocal: null,
      local: '',
      diasTrabajados: this.detalleRol.reduce(
        (acc, item) => acc + this.toNumber(item.diasTrabajados),
        0
      ),
      rubros: rubrosTotales,
      totalIngresos,
      totalDescuentos,
      liquidoRecibir
    };
  }
  private generarRolMensualNuevo(): void {
    if (this.procesandoModificar) {
      return;
    }

    this.procesandoModificar = true;

    const request = this.construirRequestGenerar(false);

    this.generando = true;

    this.rolNominaService.generarRolMensual(request).subscribe({
      next: (resp) => {
        this.generando = false;

        if (resp.type === 'Success') {
          this.mostrarExito(resp.message ?? 'Nómina generada correctamente.');
          this.periodoExiste = true;
          this.modoEdicionPeriodo = true;
          this.cargarRolMensual();
          return;
        }

        if (resp.type === 'Warning') {
          this.mostrarAdvertencia(
            resp.message ?? 'El periodo ya existe. Use Modificar para trabajar sobre la nómina existente.'
          );

          this.periodoExiste = true;
          this.modoEdicionPeriodo = !this.periodoCerrado;
          this.cargarRolMensual();
          return;
        }

        this.mostrarAdvertencia(resp.message ?? 'No se pudo generar la nómina.');
      },
      error: (err) => {
        this.generando = false;
        console.error('Error al generar nómina:', err);
        this.mostrarError('Error al generar la nómina mensual.');
      }
    });
  }

  accionPrincipalPeriodo(): void {
    if (
      this.generando ||
      this.cargando ||
      this.validandoCierre ||
      this.procesandoModificar ||
      this.modificarBloqueado ||
      (this.periodoExiste && this.periodoCerrado)
    ) {
      return;
    }

    if (this.periodoExiste) {
      this.modificarPeriodo();
      return;
    }

    this.nuevo();
  }

  modificarPeriodo(): void {
    if (!this.periodoExiste) {
      this.mostrarAdvertencia('Primero debe crear o consultar el periodo.');
      return;
    }

    if (this.periodoCerrado) {
      this.mostrarAdvertencia(
        'El periodo está cerrado. No se puede modificar la nómina.'
      );
      return;
    }

    this.modoEdicionPeriodo = true;
    this.mostrarExito('Periodo habilitado para modificación.');
  }

  private validarEstadoCierrePeriodo(): void {
    if (!this.form.value.fechaPeriodo) {
      this.periodoCerrado = false;
      return;
    }

    const request: ValidarCierrePeriodoRequest = {
      fecha: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo)
    };

    this.cierrePeriodoService.validar(request).subscribe({
      next: (resp) => {
        this.periodoCerrado =
          resp.type === 'Success' &&
          resp.data?.existe === true;
      },
      error: (err) => {
        console.error('Error validando estado de cierre:', err);
        this.periodoCerrado = false;
      }
    });
  }


  private descargarImpresionRolIndividual(empleado: any): void {
    const fechaPeriodo = this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo);

    this.cargando = true;

    this.rolNominaService
      .descargarRolIndividualPdf(empleado.idEmpleado, fechaPeriodo)
      .subscribe({
        next: (blob: Blob) => {
          this.cargando = false;

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          const nombreEmpleado = this.normalizarNombreArchivo(
            empleado.nombreEmpleado ||
            empleado.empleado ||
            empleado.nombre ||
            `empleado_${empleado.idEmpleado}`
          );

          const periodoArchivo = fechaPeriodo.replace(/-/g, '');

          const nombreArchivo = `${nombreEmpleado}_${periodoArchivo}.pdf`;

          link.href = url;
          link.download = nombreArchivo;
          link.click();

          window.URL.revokeObjectURL(url);

          this.mostrarExito('Impresión de rol descargada correctamente.');
        },
        error: err => {
          this.cargando = false;
          console.error('Error descargando impresión de rol:', err);
          this.mostrarError('No se pudo descargar la impresión del rol individual.');
        }
      });
  }
  private normalizarNombreArchivo(valor: string): string {
    if (!valor) {
      return 'rol_individual';
    }

    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ñ/g, 'N')
      .replace(/ñ/g, 'n')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }
  recalcularRolMensual(): void {
    if (this.actualizando || this.cargando || this.generando || this.validandoCierre) {
      return;
    }

    const fechaPeriodo = this.formatearFechaYYYYMMDD(
      this.form.value.fechaPeriodo
    );

    if (!fechaPeriodo) {
      this.mostrarAdvertencia('Debe seleccionar un periodo.');
      return;
    }

    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    const request: RecalcularRolMensualRequest = {
      fechaPeriodo,
      idLocal: tipoNodo === 'LOCAL'
        ? this.nodoSeleccionado!.id
        : null,
      idDepartamento: tipoNodo === 'DEPARTAMENTO'
        ? this.nodoSeleccionado!.id
        : null,
      idUsuario: this.usuarioActual?.id_usuario ?? 1,
    };

    this.confirmarAccion(
      'Recalcular rol mensual',
      'Se recalculará y grabará la nómina de los empleados del periodo seleccionado. ¿Desea continuar?',
      'Sí, recalcular',
      'Cancelar'
    ).subscribe((confirmado: boolean) => {
      if (confirmado !== true) {
        return;
      }

      this.actualizando = true;

      this.rolNominaService.recalcularRolMensual(request)
        .subscribe({
          next: resp => {
            if (resp.type === 'Success') {
              this.mostrarExito(resp.message ?? 'Rol mensual recalculado correctamente.');
              this.cargarRolMensual();
              return;
            }

            if (resp.type === 'Warning') {
              this.mostrarAdvertencia(resp.message ?? 'No se pudo recalcular el rol mensual.');
              return;
            }

            if (resp.type === 'Error') {
              this.mostrarError(resp.message ?? 'Error al recalcular el rol mensual.');
              return;
            }

            this.mostrarAdvertencia(resp.message ?? 'No se pudo recalcular el rol mensual.');
          },
          error: err => {
            console.error(err);
            this.mostrarError('Error al recalcular el rol mensual.');
          },
          complete: () => {
            this.actualizando = false;
          }
        });
    });
  }
  private reordenarColumnasIngresos(columnas: ColDef[]): ColDef[] {
    const colSueldo = columnas.find(x =>
      this.textoColumna(x).includes('SUELDO')
    );

    const colDiasTrabajados = columnas.find(x =>
      this.textoColumna(x).includes('DIAS TRABAJADOS') ||
      this.textoColumna(x).includes('DÍAS TRABAJADOS')
    );

    const otrasColumnas = columnas.filter(x =>
      x !== colSueldo &&
      x !== colDiasTrabajados
    );

    const columnasOrdenadas: ColDef[] = [];

    if (colSueldo) {
      columnasOrdenadas.push(colSueldo);
    }

    /*
     * Nueva columna: VALOR DIAS TRABAJADOS.
     * Toma el mismo valor monetario del sueldo.
     */
    if (colSueldo) {
      columnasOrdenadas.push({
        headerName: 'VALOR DIAS TRAB.',
        colId: 'valorDiasTrabajados',
        width: 155,
        type: 'numericColumn',
        filter: true,
        headerClass: 'header-ingreso',
        cellClass: params =>
          params.node?.rowPinned
            ? 'cell-ingreso cell-total-row'
            : 'cell-ingreso',
        cellStyle: {
          backgroundColor: '#f0fdf4',
          color: '#065f46',
          fontWeight: '600'
        },
        valueGetter: params => {
          const rubros = params.data?.rubros ?? {};

          /*
           * Intenta tomar el valor de SUELDO desde la columna dinámica.
           */
          const keySueldo = colSueldo.colId;

          if (keySueldo && rubros[keySueldo]) {
            return this.toNumber(rubros[keySueldo]);
          }

          return 0;
        },
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimalValor(params.value)
      });
    }

    /*
     * Luego va DIAS TRABAJADOS, que muestra 30.00
     */
    if (colDiasTrabajados) {
      columnasOrdenadas.push({
        ...colDiasTrabajados,
        headerName: 'DIAS TRAB.',
        width: 120,
        valueFormatter: (params: ValueFormatterParams) =>
          this.formatearDecimalValor(params.value)
      });
    }

    columnasOrdenadas.push(...otrasColumnas);

    return columnasOrdenadas;
  }
  private textoColumna(col: ColDef): string {
    return (col.headerName ?? '').toString().trim().toUpperCase();
  }
  private ordenarColumnasIngresosConDias(
    columnas: Array<ColDef | ColGroupDef>
  ): Array<ColDef | ColGroupDef> {
    const colSueldo = columnas.find(x =>
      this.textoColumnaGrupo(x).includes('SUELDO')
    );

    const colDiasTrabajados = columnas.find(x =>
      this.textoColumnaGrupo(x).includes('DIAS TRABAJADOS') ||
      this.textoColumnaGrupo(x).includes('DÍAS TRABAJADOS')
    );

    const otrasColumnas = columnas.filter(x =>
      x !== colSueldo &&
      x !== colDiasTrabajados
    );

    const resultado: Array<ColDef | ColGroupDef> = [];

    if (colSueldo) {
      resultado.push(colSueldo);
    }

    if (colDiasTrabajados) {
      resultado.push(colDiasTrabajados);
    }

    resultado.push(...otrasColumnas);

    return resultado;
  }


  private textoColumnaGrupo(col: ColDef | ColGroupDef): string {
    return (col.headerName ?? '').toString().trim().toUpperCase();
  }
  toggleSeleccionEmpleado(item: any, checked: boolean): void {
    const idEmpleado = Number(item?.idEmpleado);

    if (!idEmpleado) {
      return;
    }

    if (checked) {
      this.empleadosSeleccionados.add(idEmpleado);
    } else {
      this.empleadosSeleccionados.delete(idEmpleado);
    }

    this.actualizarEstadoSeleccionGeneral();
  }

  toggleSeleccionTodos(checked: boolean): void {
    this.todosSeleccionados = checked;
    this.empleadosSeleccionados.clear();

    if (checked) {
      this.detalleRol.forEach((item: any) => {
        const idEmpleado = Number(item?.idEmpleado);

        if (idEmpleado) {
          this.empleadosSeleccionados.add(idEmpleado);
        }
      });
    }

    this.gridApi?.refreshCells({ force: true });
  }

  estaSeleccionado(item: any): boolean {
    const idEmpleado = Number(item?.idEmpleado);

    if (!idEmpleado) {
      return false;
    }

    return this.empleadosSeleccionados.has(idEmpleado);
  }

  private actualizarEstadoSeleccionGeneral(): void {
    const totalEmpleados = this.detalleRol?.length ?? 0;

    if (totalEmpleados === 0) {
      this.todosSeleccionados = false;
      return;
    }

    this.todosSeleccionados = this.empleadosSeleccionados.size === totalEmpleados;
  }



  obtenerEmpleadosSeleccionados(): any[] {
    if (!this.gridApi) {
      return [];
    }

    return this.gridApi.getSelectedRows() ?? [];
  }
  enviandoCorreos = false;


  procesadosCorreos = 0;
  totalCorreos = 0;

  enviarPdfEmpleadosSeleccionados(): void {
    const empleados = this.obtenerEmpleadosSeleccionados();

    if (empleados.length === 0) {
      this.mostrarAdvertencia('Debe seleccionar al menos un empleado.');
      return;
    }

    const fechaPeriodo = this.form.value.fechaPeriodo;

    if (!fechaPeriodo) {
      this.mostrarAdvertencia('Debe seleccionar el periodo.');
      return;
    }

    const idsEmpleados = empleados
      .map((x: any) => Number(x.idEmpleado))
      .filter((x: number) => x > 0);

    if (idsEmpleados.length === 0) {
      this.mostrarAdvertencia('No se encontraron empleados válidos seleccionados.');
      return;
    }

    const total = idsEmpleados.length;

    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        type: 'warning',
        title: 'Confirmar envío de roles',
        message: `¿Está seguro de enviar los roles individuales por correo a ${total} empleado(s) seleccionado(s)?`,
        confirmText: 'Sí, enviar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe(confirmado => {
      if (confirmado === true) {
        this.ejecutarEnvioRolesCorreo(idsEmpleados);
      }
    });
  }

  private ejecutarEnvioRolesCorreo(idsEmpleados: number[]): void {
    const request: EnviarRolesCorreoRequest = {
      fechaPeriodo: this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo),
      idUsuario: 1,
      idsEmpleados
    };

    this.enviandoCorreos = true;
    this.procesadosCorreos = 0;
    this.totalCorreos = idsEmpleados.length;

    const dialogProcesoRef = this.dialog.open<DialogProcesoComponent>(
      DialogProcesoComponent,
      {
        disableClose: true,
        width: '400px',
        data: {
          procesados: 0,
          total: this.totalCorreos,
          titulo: 'Enviando roles por correo',
          mensaje: 'Generando PDFs y enviando correos...'
        }
      }
    );

    this.rolNominaService.enviarRolesPorCorreo(request).subscribe({
      next: resp => {
        this.enviandoCorreos = false;

        const data = resp.data;

        const totalProcesados =
          (data?.totalEnviados ?? 0) +
          (data?.totalSinCorreo ?? 0) +
          (data?.errores?.length ?? 0);

        dialogProcesoRef.componentInstance.data.procesados = totalProcesados;
        dialogProcesoRef.componentInstance.data.total = this.totalCorreos;

        setTimeout(() => {
          dialogProcesoRef.close();

          if (resp.type === 'Success' && data?.procesado) {
            this.mostrarExito(
              data.mensaje ??
              `Roles enviados correctamente. Enviados: ${data.totalEnviados}.`
            );

            this.gridApi?.deselectAll();
            return;
          }

          if (resp.type === 'Warning') {
            this.mostrarAdvertencia(
              data?.mensaje ??
              resp.message ??
              'El proceso terminó con advertencias.'
            );

            this.mostrarResumenEnvioRoles(data);
            return;
          }

          this.mostrarError(
            data?.mensaje ??
            resp.message ??
            'No se pudieron enviar los roles por correo.'
          );
        }, 400);
      },
      error: err => {
        this.enviandoCorreos = false;
        dialogProcesoRef.close();

        console.error('Error enviando roles por correo:', err);

        this.mostrarError(
          err?.error?.message ??
          err?.error?.data?.mensaje ??
          'Error al enviar los roles por correo.'
        );
      }
    });
  }
  private mostrarResumenEnvioRoles(data: any): void {
    if (!data) {
      return;
    }

    const errores = data.errores ?? [];
    const sinCorreo = data.sinCorreo ?? [];

    const erroresTexto = errores.length > 0
      ? errores.slice(0, 5).join('\n')
      : '';

    const sinCorreoTexto = sinCorreo.length > 0
      ? sinCorreo.slice(0, 5).join('\n')
      : '';

    let mensaje =
      `Proceso finalizado.\n\n` +
      `Total empleados: ${data.totalEmpleados ?? 0}\n` +
      `Enviados: ${data.totalEnviados ?? 0}\n` +
      `Sin correo: ${data.totalSinCorreo ?? 0}\n` +
      `Errores: ${errores.length}\n`;

    if (sinCorreo.length > 0) {
      mensaje += `\nPrimeros empleados sin correo:\n${sinCorreoTexto}`;

      if (sinCorreo.length > 5) {
        mensaje += `\n... y ${sinCorreo.length - 5} más.`;
      }
    }

    if (errores.length > 0) {
      mensaje += `\n\nPrimeros errores:\n${erroresTexto}`;

      if (errores.length > 5) {
        mensaje += `\n... y ${errores.length - 5} más.`;
      }
    }

    this.dialog.open(CustomMessageBoxComponent, {
      width: '520px',
      data: {
        type: errores.length > 0 ? 'warning' : 'info',
        title: 'Resumen de envío de roles',
        message: mensaje,
        confirmText: 'Aceptar'
      }
    });
  }


  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(() => {
      this.ajustarGrid();
    }, 100);
  }

  onGridSizeChanged(): void {
    this.ajustarGrid();
  }

  onFirstDataRendered(): void {
    this.ajustarGrid();
  }

  private ajustarGrid(): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      this.gridApi.refreshHeader();
      this.gridApi.refreshCells({ force: true });
    }, 50);
  }
  async exportarRolExcel(): Promise<void> {
    if (!this.detalleRol || this.detalleRol.length === 0) {
      this.mostrarAdvertencia('No existen datos para exportar.');
      return;
    }

    this.exportandoExcel = true;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rol Mensual');

      const fechaPeriodo = this.form.value.fechaPeriodo
        ? this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo)
        : '';

      const columnas = this.obtenerColumnasExcel();

      if (columnas.length === 0) {
        this.mostrarAdvertencia('No existen columnas para exportar.');
        return;
      }

      const totalColumnas = columnas.length;

      worksheet.mergeCells(1, 1, 1, totalColumnas);
      const titulo = worksheet.getCell(1, 1);
      titulo.value = 'GENERACIÓN DE ROLES MENSUALES';
      titulo.font = { bold: true, size: 14 };
      titulo.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(2, 1, 2, totalColumnas);
      const periodo = worksheet.getCell(2, 1);
      periodo.value = fechaPeriodo ? `Periodo: ${fechaPeriodo}` : 'Periodo:';
      periodo.font = { bold: true, size: 10 };
      periodo.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]);

      const filaHeaderGrupo = 4;
      const filaHeaderDetalle = 5;

      columnas.forEach((col, index) => {
        const columnaExcel = index + 1;

        const cellGrupo = worksheet.getCell(filaHeaderGrupo, columnaExcel);
        cellGrupo.value = col.grupoHeaderName || col.headerName;
        cellGrupo.font = { bold: true, size: 9 };
        cellGrupo.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cellGrupo.border = this.bordeExcel();
        cellGrupo.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: this.obtenerColorHeaderExcel(col) }
        };

        const cellDetalle = worksheet.getCell(filaHeaderDetalle, columnaExcel);
        cellDetalle.value = col.subHeaderName || '';
        cellDetalle.font = { bold: true, size: 9 };
        cellDetalle.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cellDetalle.border = this.bordeExcel();
        cellDetalle.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: this.obtenerColorHeaderExcel(col) }
        };

        /*
         * Si la columna no tiene subheader, se une verticalmente:
         * Código, Nombre, SUELDO, BONO, RETROACTIVO, etc.
         */
        if (!col.subHeaderName) {
          worksheet.mergeCells(
            filaHeaderGrupo,
            columnaExcel,
            filaHeaderDetalle,
            columnaExcel
          );
        }
      });

      this.detalleRol.forEach((item: any) => {
        const valores = columnas.map(col =>
          this.obtenerValorColumnaExcel(item, col)
        );

        const row = worksheet.addRow(valores);

        row.eachCell((cell, colNumber) => {
          const columna = columnas[colNumber - 1];

          cell.border = this.bordeExcel();
          cell.font = {
            size: 9,
            bold: this.esColumnaTotalExcel(columna),
            color: { argb: this.obtenerColorTextoExcel(columna) }
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: this.obtenerColorCeldaExcel(columna) }
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: this.esColumnaNumericaExcel(columna) ? 'right' : 'left'
          };

          if (this.esColumnaNumericaExcel(columna)) {
            cell.numFmt = columna.colId?.endsWith('_CANT')
              ? '#,##0.##'
              : '#,##0.00';
          }
        });
      });

      if (this.pinnedBottomRowData && this.pinnedBottomRowData.length > 0) {
        const totalData = this.pinnedBottomRowData[0];

        const valoresTotales = columnas.map(col =>
          this.obtenerValorColumnaExcel(totalData, col)
        );

        const totalRow = worksheet.addRow(valoresTotales);

        totalRow.eachCell((cell, colNumber) => {
          const columna = columnas[colNumber - 1];

          cell.border = this.bordeExcel();
          cell.font = {
            bold: true,
            size: 9,
            color: { argb: this.obtenerColorTextoExcel(columna) }
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: this.obtenerColorTotalExcel(columna) }
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: this.esColumnaNumericaExcel(columna) ? 'right' : 'left'
          };

          if (this.esColumnaNumericaExcel(columna)) {
            cell.numFmt = columna.colId?.endsWith('_CANT')
              ? '#,##0.##'
              : '#,##0.00';
          }
        });
      }

      columnas.forEach((col, index) => {
        const excelCol = worksheet.getColumn(index + 1);

        if (col.colId === 'codigoEmpleado') {
          excelCol.width = 12;
        } else if (col.colId === 'nombreEmpleado') {
          excelCol.width = 36;
        } else if (col.colId === 'diasTrabajadosCantidad') {
          excelCol.width = 13;
        } else if (col.colId?.endsWith('_CANT')) {
          excelCol.width = 10;
        } else if (this.esColumnaTotalExcel(col)) {
          excelCol.width = 17;
        } else {
          excelCol.width = 15;
        }
      });

      worksheet.views = [
        {
          state: 'frozen',
          ySplit: filaHeaderDetalle,
          xSplit: 2
        }
      ];

      worksheet.autoFilter = {
        from: { row: filaHeaderDetalle, column: 1 },
        to: { row: filaHeaderDetalle, column: totalColumnas }
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const nombreArchivo = fechaPeriodo
        ? `Rol_Mensual_${fechaPeriodo}.xlsx`
        : 'Rol_Mensual.xlsx';

      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        nombreArchivo
      );

      this.mostrarExito('Archivo Excel generado correctamente.');
    } catch (error) {
      console.error('Error exportando Excel:', error);
      this.mostrarError('No se pudo exportar el rol a Excel.');
    } finally {
      this.exportandoExcel = false;
    }
  }
 private obtenerColumnasExcel(): any[] {
  if (!this.gridApi) {
    return [];
  }

  const columnas: any[] = this.gridApi
    .getAllDisplayedColumns()
    .map(col => {
      const colDef: any = col.getColDef();

      const rubroHeaderName =
        colDef.rubroHeaderName ??
        colDef.headerTooltip ??
        colDef.headerName ??
        col.getColId();

      const rubroSubHeaderName =
        colDef.rubroSubHeaderName ??
        '';

      return {
        colId: col.getColId(),
        field: colDef.field,
        headerName: colDef.headerName || col.getColId(),

        grupoHeaderName: rubroHeaderName,
        subHeaderName: rubroSubHeaderName,

        colDef
      };
    })
    .filter(col => col.colId !== 'seleccion');

  /*
   * Columnas que NO se muestran en el grid,
   * pero SÍ se exportan a Excel.
   */
  const columnasSoloExcel: any[] = [
    {
      colId: 'cedulaExcel',
      field: 'cedula',
      headerName: 'Cédula',
      grupoHeaderName: 'Cédula',
      subHeaderName: '',
      soloExcel: true,
      colDef: null
    },
    {
      colId: 'cargoExcel',
      field: 'cargo',
      headerName: 'Cargo',
      grupoHeaderName: 'Cargo',
      subHeaderName: '',
      soloExcel: true,
      colDef: null
    },
    {
      colId: 'localExcel',
      field: 'local',
      headerName: 'Local',
      grupoHeaderName: 'Local',
      subHeaderName: '',
      soloExcel: true,
      colDef: null
    }
  ];

  /*
   * Insertar después de Nombre.
   */
  const indiceNombre = columnas.findIndex(x =>
    x.colId === 'nombreEmpleado' ||
    x.field === 'nombreEmpleado'
  );

  if (indiceNombre >= 0) {
    columnas.splice(indiceNombre + 1, 0, ...columnasSoloExcel);
  } else {
    columnas.unshift(...columnasSoloExcel);
  }

  return columnas;
}
  private obtenerValorColumnaExcel(item: any, columna: any): any {
    if (!item || !columna) {
      return '';
    }

    const colId = columna.colId;
    const field = columna.field;

    if (colId === 'codigoEmpleado') {
      return item.codigoEmpleado ?? '';
    }

    if (colId === 'nombreEmpleado') {
      return item.nombreEmpleado ?? '';
    }
    if (colId === 'cedulaExcel') {
      return item.cedula ?? '';
    }

    if (colId === 'cargoExcel') {
      return item.cargo ?? '';
    }

    if (colId === 'localExcel') {
      return item.local ?? '';
    }
    if (colId === 'diasTrabajadosCantidad') {
      return this.toNumber(item.diasTrabajados);
    }

    if (field && item[field] !== undefined) {
      return item[field];
    }

    if (item.rubros && item.rubros[colId] !== undefined) {
      return this.toNumber(item.rubros[colId]);
    }

    if (item[colId] !== undefined) {
      return item[colId];
    }

    return '';
  }

private esColumnaNumericaExcel(columna: any): boolean {
  return ![
    'codigoEmpleado',
    'nombreEmpleado',
    'cedulaExcel',
    'cargoExcel',
    'localExcel'
  ].includes(columna.colId);
}

  private esColumnaTotalExcel(columna: any): boolean {
    return [
      'totalIngresos',
      'totalDescuentos',
      'liquidoRecibir'
    ].includes(columna.colId);
  }

  private obtenerColorHeaderExcel(columna: any): string {
    const colId = columna.colId;

    if (colId.endsWith('I') || colId.endsWith('I_CANT') || colId === 'diasTrabajadosCantidad') {
      return 'FFDCFCE7';
    }

    if (colId.endsWith('D') || colId.endsWith('D_CANT')) {
      return 'FFFEE2E2';
    }

    if (this.esColumnaTotalExcel(columna)) {
      return 'FFDBEAFE';
    }

    return 'FFF1F5F9';
  }

  private obtenerColorCeldaExcel(columna: any): string {
    const colId = columna.colId;

    if (colId.endsWith('I') || colId.endsWith('I_CANT') || colId === 'diasTrabajadosCantidad') {
      return 'FFECFDF5';
    }

    if (colId.endsWith('D') || colId.endsWith('D_CANT')) {
      return 'FFFFF1F2';
    }

    if (colId === 'totalIngresos') {
      return 'FFDCFCE7';
    }

    if (colId === 'totalDescuentos') {
      return 'FFFEF9C3';
    }

    if (colId === 'liquidoRecibir') {
      return 'FFDBEAFE';
    }

    return 'FFFFFFFF';
  }

  private obtenerColorTotalExcel(columna: any): string {
    const colId = columna.colId;

    if (colId.endsWith('I') || colId.endsWith('I_CANT') || colId === 'diasTrabajadosCantidad') {
      return 'FFD9F99D';
    }

    if (colId.endsWith('D') || colId.endsWith('D_CANT')) {
      return 'FFFECACA';
    }

    if (colId === 'totalIngresos') {
      return 'FFBBF7D0';
    }

    if (colId === 'totalDescuentos') {
      return 'FFFDE68A';
    }

    if (colId === 'liquidoRecibir') {
      return 'FFBFDBFE';
    }

    return 'FFE2E8F0';
  }

  private obtenerColorTextoExcel(columna: any): string {
    const colId = columna.colId;

    if (colId.endsWith('I') || colId.endsWith('I_CANT') || colId === 'diasTrabajadosCantidad') {
      return 'FF047857';
    }

    if (colId.endsWith('D') || colId.endsWith('D_CANT')) {
      return 'FFB91C1C';
    }

    if (colId === 'totalIngresos') {
      return 'FF166534';
    }

    if (colId === 'totalDescuentos') {
      return 'FF854D0E';
    }

    if (colId === 'liquidoRecibir') {
      return 'FF1D4ED8';
    }

    return 'FF111827';
  }

  private bordeExcel(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }
  private debeMostrarCantidadRubro(col: RubroColumnaResponse): boolean {
    const tipoPago = (col.tipoPago ?? '').toString().trim().toUpperCase();
    const codigo = this.normalizarCodigoColumna(col.codigo);
    const descripcion = (col.descripcion ?? '').toString().trim().toUpperCase();

    /*
     * Solo ingresos manejan cantidad en el grid mensual.
     * Los descuentos como IESS, anticipos, seguros, préstamos, etc.,
     * se muestran solo como valor.
     */
    if (tipoPago !== 'I') {
      return false;
    }

    /*
     * No mostrar Cant. en rubros referenciales o valores directos.
     */
    if (descripcion.includes('SUELDO') && !descripcion.includes('DIAS')) {
      return false;
    }

    if (descripcion.includes('RETROACTIVO')) {
      return false;
    }

    if (descripcion.includes('BONO')) {
      return false;
    }

    if (descripcion.includes('FONDO')) {
      return false;
    }

    if (descripcion.includes('DECIMO') || descripcion.includes('DÉCIMO')) {
      return false;
    }

    /*
     * Sí mostrar Cant. en días trabajados.
     */
    if (codigo === '02' || descripcion.includes('DIAS TRABAJADOS')) {
      return true;
    }

    /*
     * Sí mostrar Cant. en maternidad.
     */
    if (descripcion.includes('MATERNIDAD')) {
      return true;
    }

    /*
     * Sí mostrar Cant. en enfermedad.
     */
    if (descripcion.includes('ENFERMEDAD')) {
      return true;
    }

    /*
     * Sí mostrar Cant. en accidente.
     */
    if (descripcion.includes('ACCIDENTE')) {
      return true;
    }

    /*
     * Sí mostrar Cant. en horas.
     */
    if (
      descripcion.includes('HORAS') ||
      codigo === '07' ||
      codigo === '08' ||
      codigo === '09' ||
      codigo === '10'
    ) {
      return true;
    }

    return false;
  }

  private normalizarCodigoColumna(codigo: any): string {
    const texto = (codigo ?? '').toString().trim();

    if (!texto) {
      return '';
    }

    const numero = Number(texto);

    if (!Number.isNaN(numero)) {
      return numero.toString().padStart(2, '0');
    }

    return texto;
  }
  private construirColumnaRubroFlexible(
    col: RubroColumnaResponse,
    tipo: 'INGRESO' | 'DESCUENTO'
  ): ColDef | ColGroupDef {
    if (!this.debeMostrarCantidadRubro(col)) {
      const colDef = this.construirColumnaRubro(col, tipo);

      /*
       * Metadata para Excel.
       */
      (colDef as any).rubroHeaderName = this.obtenerNombreColumnaRubro(col);
      (colDef as any).rubroSubHeaderName = '';

      return colDef;
    }

    return this.construirGrupoColumnaRubro(col, tipo);
  }
  private construirGrupoColumnaRubro(
    col: RubroColumnaResponse,
    tipo: 'INGRESO' | 'DESCUENTO'
  ): ColGroupDef {
    const key = this.obtenerKeyRubro(col);
    const keyCantidad = `${key}_CANT`;

    const nombreRubro = this.obtenerNombreColumnaRubro(col);

    const esIngreso = tipo === 'INGRESO';

    const claseBase = esIngreso
      ? 'cell-ingreso'
      : 'cell-descuento';

    const headerClass = esIngreso
      ? 'header-ingreso'
      : 'header-descuento';

    const cellStyle = esIngreso
      ? {
        backgroundColor: '#f0fdf4',
        color: '#065f46',
        fontWeight: '600'
      }
      : {
        backgroundColor: '#fefce8',
        color: '#854d0e',
        fontWeight: '600'
      };

    const columnaCantidad: ColDef = {
      headerName: 'Cant.',
      colId: keyCantidad,
      width: 80,
      minWidth: 70,
      type: 'numericColumn',
      filter: true,

      editable: params =>
        !params.node?.rowPinned &&
        this.modoEdicionPeriodo &&
        !this.periodoCerrado,

      valueParser: params => this.toNumber(params.newValue),

      /*
       * NECESARIO:
       * Como usamos valueGetter y el dato está dentro de data.rubros,
       * AG Grid necesita valueSetter para grabar el nuevo valor.
       */
      valueSetter: params => {
        if (!params.data) {
          return false;
        }

        const nuevoValor = this.toNumber(params.newValue);
        const valorAnterior = this.toNumber(params.oldValue);

        params.data.rubros = params.data.rubros ?? {};
        params.data.rubros[keyCantidad] = nuevoValor;

        return nuevoValor !== valorAnterior;
      },

      headerClass,

      cellClass: params =>
        params.node?.rowPinned
          ? `${claseBase} cell-total-row`
          : `${claseBase} celda-editable-cantidad`,

      cellStyle,

      valueGetter: params => {
        const rubros = params.data?.rubros ?? {};
        return this.toNumber(rubros[keyCantidad]);
      },

      valueFormatter: params => {
        const valor = this.toNumber(params.value);
        return valor === 0 ? '' : valor.toString();
      }
    };

    const columnaValor: ColDef = {
      headerName: 'Valor',
      colId: key,
      width: this.obtenerAnchoColumnaRubro(col),
      minWidth: 95,
      type: 'numericColumn',
      filter: true,
      headerClass,
      cellClass: params =>
        params.node?.rowPinned
          ? `${claseBase} cell-total-row`
          : claseBase,
      cellStyle,
      valueGetter: params => {
        const rubros = params.data?.rubros ?? {};
        return this.toNumber(rubros[key]);
      },
      valueFormatter: (params: ValueFormatterParams) =>
        this.formatearDecimalValor(params.value)
    };

    /*
     * Metadata para exportar Excel con título padre.
     */
    (columnaCantidad as any).rubroHeaderName = nombreRubro;
    (columnaCantidad as any).rubroSubHeaderName = 'Cant.';

    (columnaValor as any).rubroHeaderName = nombreRubro;
    (columnaValor as any).rubroSubHeaderName = 'Valor';

    return {
      headerName: nombreRubro,
      headerClass,
      marryChildren: true,
      children: [
        columnaCantidad,
        columnaValor
      ]
    };
  }
  onCellValueChanged(event: any): void {
    const colId =
      event?.colDef?.colId ??
      event?.column?.getColId?.() ??
      '';

    if (!colId) {
      return;
    }

    if (!colId.endsWith('_CANT')) {
      return;
    }

    const empleado = event.data;

    if (!empleado || !empleado.idEmpleado) {
      this.mostrarAdvertencia('No se encontró el empleado de la fila.');
      return;
    }

    if (this.periodoCerrado) {
      this.mostrarAdvertencia('El periodo está cerrado. No se puede modificar.');
      event.node.setDataValue(colId, event.oldValue);
      return;
    }

    if (!this.modoEdicionPeriodo) {
      this.mostrarAdvertencia('Debe habilitar el periodo en modo modificación.');
      event.node.setDataValue(colId, event.oldValue);
      return;
    }

    /*
     * Importante:
     * Tomar la cantidad desde data.rubros[colId],
     * porque ya fue escrita por valueSetter.
     */
    const cantidad = this.toNumber(
      empleado?.rubros?.[colId] ?? event.newValue
    );

    if (cantidad < 0) {
      this.mostrarAdvertencia('La cantidad no puede ser negativa.');
      event.node.setDataValue(colId, event.oldValue);
      return;
    }

    const keyValor = colId.replace('_CANT', '');

    const rubro = this.columnasRubros.find(x =>
      this.obtenerKeyRubro(x) === keyValor
    );

    if (!rubro) {
      this.mostrarAdvertencia('No se encontró el rubro de la columna.');
      event.node.setDataValue(colId, event.oldValue);
      return;
    }

    /*
     * Calcula en pantalla inmediatamente,
     * igual que en rol individual.
     */
    if (!this.calcularFilaMensualPorCantidad(empleado, rubro, cantidad)) {
      event.node.setDataValue(colId, event.oldValue);
      return;
    }

    event.api.refreshCells({
      force: true,
      rowNodes: [event.node]
    });

    this.pinnedBottomRowData = this.detalleRol.length > 0
      ? [this.construirFilaTotales()]
      : [];

    this.guardarCantidadRubroMensual(
      empleado,
      rubro,
      cantidad,
      event
    );
  }
  private guardarCantidadRubroMensual(
    empleado: any,
    rubro: RubroColumnaResponse,
    cantidad: number,
    event: any
  ): void {
    const fechaPeriodo = this.formatearFechaYYYYMMDD(
      this.form.value.fechaPeriodo
    );

    const request = {
      idEmpleado: Number(empleado.idEmpleado),
      fechaPeriodo,
      idIngDesc: Number(rubro.idIngDesc),
      cantidad,
      idUsuario: this.usuarioActual?.id_usuario ?? 1
    };

    this.actualizando = true;

    this.rolNominaService.actualizarCantidadRubroMensual(request)
      .subscribe({
        next: resp => {
          this.actualizando = false;

          if (resp.type !== 'Success') {
            this.mostrarAdvertencia(resp.message ?? 'No se pudo actualizar la cantidad.');
            event.node.setDataValue(event.colDef.colId, event.oldValue);
            this.cargarRolMensual();
            return;
          }

          this.mostrarExito(resp.message ?? 'Cantidad actualizada correctamente.');

          /*
           * El backend guarda el dato definitivo.
           * Se recarga para asegurar que el rol individual y mensual queden iguales.
           */
          this.cargarRolMensual();
        },
        error: err => {
          this.actualizando = false;
          console.error(err);

          this.mostrarError('Error al actualizar la cantidad del rubro.');
          event.node.setDataValue(event.colDef.colId, event.oldValue);
          this.cargarRolMensual();
        }
      });
  }
  onCellDoubleClicked(event: any): void {
    const colId =
      event?.column?.getColId?.() ??
      event?.colDef?.colId ??
      '';

    /*
     * No abrir rol individual si es fila de totales.
     */
    if (event?.node?.rowPinned) {
      return;
    }

    /*
     * No abrir desde el checkbox.
     */
    if (colId === 'seleccion') {
      return;
    }

    /*
     * No abrir desde columnas Cant., porque ahí estás editando cantidades.
     */
    if (colId.endsWith('_CANT')) {
      return;
    }

    /*
     * Aquí sí llama al método existente.
     */
    this.abrirRolIndividual(event);
  }
  private calcularFilaMensualPorCantidad(
    empleado: any,
    rubro: RubroColumnaResponse,
    cantidad: number
  ): boolean {
    const key = this.obtenerKeyRubro(rubro);
    const keyCantidad = `${key}_CANT`;

    empleado.rubros = empleado.rubros ?? {};
    empleado.rubros[keyCantidad] = cantidad;

    if (!this.validarCantidadMensual(empleado, rubro, cantidad)) {
      return false;
    }

    const valor = this.calcularValorRubroMensual(
      empleado,
      rubro,
      cantidad
    );

    empleado.rubros[key] = valor;

    /*
     * Si es ausencia, recalcula DIAS TRABAJADOS.
     */
    if (this.esRubroAusenciaMensual(rubro)) {
      this.recalcularDiasTrabajadosFila(empleado);
    }

    /*
     * Recalcular automáticos.
     */
    this.recalcularAporteIessFila(empleado);
    this.recalcularFondoReservaFila(empleado);
    this.recalcularDecimoTerceroFila(empleado);

    this.recalcularTotalesFila(empleado);

    return true;
  }
  private validarCantidadMensual(
    empleado: any,
    rubro: RubroColumnaResponse,
    cantidad: number
  ): boolean {
    if (cantidad < 0) {
      this.mostrarAdvertencia('No puede ingresar cantidades negativas.');
      return false;
    }

    if (this.esRubroAusenciaMensual(rubro)) {
      if (cantidad > 30) {
        this.mostrarAdvertencia('No puede ingresar más de 30 días en un rubro de ausencia.');
        return false;
      }

      const totalAusencias = this.obtenerDiasAusenciasFila(empleado);

      if (totalAusencias > 30) {
        this.mostrarAdvertencia(
          'La suma de maternidad, enfermedad y accidente de trabajo no puede superar 30 días.'
        );
        return false;
      }
    }

    return true;
  }
  private calcularValorRubroMensual(
    empleado: any,
    rubro: RubroColumnaResponse,
    cantidad: number
  ): number {
    const sueldo = this.obtenerSueldoFila(empleado);
    const codigo = this.normalizarCodigoColumna(rubro.codigo);
    const descripcion = (rubro.descripcion ?? '').toString().trim().toUpperCase();

    if (sueldo <= 0 || cantidad <= 0) {
      return 0;
    }

    /*
     * DIAS TRABAJADOS.
     */
    if (codigo === '02' || descripcion.includes('DIAS TRABAJADOS')) {
      return this.redondear((sueldo / 30) * cantidad);
    }

    /*
     * MATERNIDAD.
     */
    if (descripcion.includes('MATERNIDAD')) {
      return this.redondear((sueldo / 30) * 0.25 * cantidad);
    }

    /*
     * ENFERMEDAD.
     */
    if (descripcion.includes('ENFERMEDAD')) {
      const factor = this.obtenerFactorEnfermedadMensual(codigo);
      return this.redondear((sueldo / 30) * factor * cantidad);
    }

    /*
     * ACCIDENTE TRABAJO.
     */
    if (descripcion.includes('ACCIDENTE')) {
      const factor = this.obtenerFactorAccidenteMensual(codigo);
      return this.redondear((sueldo / 30) * factor * cantidad);
    }

    /*
     * HORAS EXTRAS.
     */
    if (
      descripcion.includes('HORAS') ||
      codigo === '07' ||
      codigo === '08' ||
      codigo === '09' ||
      codigo === '10'
    ) {
      const valorHora = sueldo / 240;
      const factor = this.obtenerFactorHoraExtraMensual(codigo);

      return this.redondear(valorHora * factor * cantidad);
    }

    return 0;
  }
  private obtenerFactorHoraExtraMensual(codigo: string): number {
    switch (codigo) {
      case '07':
        return 0.25;
      case '08':
        return 1.25;
      case '09':
        return 1.50;
      case '10':
        return 2.00;
      default:
        return 0;
    }
  }

  private obtenerFactorEnfermedadMensual(codigo: string): number {
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

  private obtenerFactorAccidenteMensual(codigo: string): number {
    switch (codigo) {
      case '51':
        return 1.00;
      case '53':
        return 0.00;
      default:
        return 0;
    }
  }
  private recalcularDiasTrabajadosFila(empleado: any): void {
    const sueldo = this.obtenerSueldoFila(empleado);

    const keyDias = this.obtenerKeyPorCodigoTipo('02', 'I');
    const keyDiasCant = `${keyDias}_CANT`;

    if (!keyDias) {
      return;
    }

    const diasActuales = this.toNumber(empleado.rubros?.[keyDiasCant]);
    const ausencias = this.obtenerDiasAusenciasFila(empleado);

    /*
     * Base periodo = días trabajados actuales + ausencias actuales.
     * Si está vacío, usamos 30.
     */
    let diasBasePeriodo = diasActuales + ausencias;

    if (diasBasePeriodo <= 0 || diasBasePeriodo > 30) {
      diasBasePeriodo = 30;
    }

    const diasTrabajados = Math.max(diasBasePeriodo - ausencias, 0);

    empleado.rubros[keyDiasCant] = diasTrabajados;
    empleado.rubros[keyDias] = this.redondear((sueldo / 30) * diasTrabajados);
    empleado.diasTrabajados = diasTrabajados;
  }
  private recalcularAporteIessFila(empleado: any): void {
    const keyIess = this.obtenerKeyPorCodigoTipo('25', 'D');

    if (!keyIess) {
      return;
    }

    const sueldo = this.obtenerSueldoFila(empleado);
    const porcentajeIess = 9.45;

    const hayMaternidad = this.columnasRubros.some(col =>
      this.esRubroMaternidadMensual(col) &&
      this.toNumber(empleado.rubros?.[`${this.obtenerKeyRubro(col)}_CANT`]) > 0
    );

    let baseIess = 0;

    if (hayMaternidad) {
      baseIess = sueldo;

      baseIess += this.columnasRubros
        .filter(col => col.tipoPago === 'I')
        .filter(col => !this.esRubroSueldoMensual(col))
        .filter(col => !this.esRubroDiasTrabajadosMensual(col))
        .filter(col => !this.esRubroMaternidadMensual(col))
        .filter(col => !this.esBeneficioNoAportableMensual(col))
        .reduce((acc, col) => {
          const key = this.obtenerKeyRubro(col);
          return acc + this.toNumber(empleado.rubros?.[key]);
        }, 0);
    } else {
      baseIess = this.columnasRubros
        .filter(col => col.tipoPago === 'I')
        .filter(col => !this.esRubroSueldoMensual(col))
        .filter(col => !this.esBeneficioNoAportableMensual(col))
        .reduce((acc, col) => {
          const key = this.obtenerKeyRubro(col);
          return acc + this.toNumber(empleado.rubros?.[key]);
        }, 0);
    }

    empleado.rubros[keyIess] = this.redondear(baseIess * porcentajeIess / 100);
  }
  private recalcularFondoReservaFila(empleado: any): void {
    const keyFondo = this.obtenerKeyPorCodigoTipo('18', 'I');

    if (!keyFondo) {
      return;
    }

    const porcentajeFondo = 8.33;

    const baseFondo = this.columnasRubros
      .filter(col => col.tipoPago === 'I')
      .filter(col => !this.esRubroSueldoMensual(col))
      .filter(col => !this.esRubroMaternidadMensual(col))
      .filter(col => !this.esBeneficioNoAportableMensual(col))
      .reduce((acc, col) => {
        const key = this.obtenerKeyRubro(col);
        return acc + this.toNumber(empleado.rubros?.[key]);
      }, 0);

    empleado.rubros[keyFondo] = this.redondear(baseFondo * porcentajeFondo / 100);
  }

  private recalcularDecimoTerceroFila(empleado: any): void {
    const keyDecimo = this.obtenerKeyPorCodigoTipo('46', 'I');

    if (!keyDecimo) {
      return;
    }

    const baseDecimo = this.columnasRubros
      .filter(col => col.tipoPago === 'I')
      .filter(col => !this.esRubroSueldoMensual(col))
      .filter(col => !this.esRubroMaternidadMensual(col))
      .filter(col => !this.esBeneficioNoAportableMensual(col))
      .reduce((acc, col) => {
        const key = this.obtenerKeyRubro(col);
        return acc + this.toNumber(empleado.rubros?.[key]);
      }, 0);

    empleado.rubros[keyDecimo] = this.redondear(baseDecimo / 12);
  }
  private recalcularTotalesFila(empleado: any): void {
    empleado.totalIngresos = this.columnasRubros
      .filter(col => col.tipoPago === 'I')
      .filter(col => !this.esRubroSueldoMensual(col))
      .reduce((acc, col) => {
        const key = this.obtenerKeyRubro(col);
        return acc + this.toNumber(empleado.rubros?.[key]);
      }, 0);

    empleado.totalDescuentos = this.columnasRubros
      .filter(col => col.tipoPago === 'D')
      .reduce((acc, col) => {
        const key = this.obtenerKeyRubro(col);
        return acc + this.toNumber(empleado.rubros?.[key]);
      }, 0);

    empleado.liquidoRecibir =
      empleado.totalIngresos - empleado.totalDescuentos;
  }
  private obtenerSueldoFila(empleado: any): number {
    const keySueldo = this.obtenerKeyPorCodigoTipo('03', 'I');

    if (keySueldo) {
      return this.toNumber(empleado.rubros?.[keySueldo]);
    }

    return 0;
  }

  private obtenerKeyPorCodigoTipo(codigo: string, tipoPago: string): string {
    const codigoNorm = this.normalizarCodigoColumna(codigo);
    const tipoNorm = (tipoPago ?? '').toString().trim().toUpperCase();

    const col = this.columnasRubros.find(x =>
      this.normalizarCodigoColumna(x.codigo) === codigoNorm &&
      (x.tipoPago ?? '').toString().trim().toUpperCase() === tipoNorm
    );

    return col ? this.obtenerKeyRubro(col) : '';
  }

  private obtenerDiasAusenciasFila(empleado: any): number {
    return this.columnasRubros
      .filter(col => this.esRubroAusenciaMensual(col))
      .reduce((acc, col) => {
        const key = `${this.obtenerKeyRubro(col)}_CANT`;
        return acc + this.toNumber(empleado.rubros?.[key]);
      }, 0);
  }

  private esRubroAusenciaMensual(col: RubroColumnaResponse): boolean {
    return this.esRubroMaternidadMensual(col) ||
      this.esRubroEnfermedadMensual(col) ||
      this.esRubroAccidenteMensual(col);
  }

  private esRubroSueldoMensual(col: RubroColumnaResponse): boolean {
    return col.tipoPago === 'I' &&
      this.normalizarCodigoColumna(col.codigo) === '03';
  }

  private esRubroDiasTrabajadosMensual(col: RubroColumnaResponse): boolean {
    return col.tipoPago === 'I' &&
      this.normalizarCodigoColumna(col.codigo) === '02';
  }

  private esRubroMaternidadMensual(col: RubroColumnaResponse): boolean {
    const desc = (col.descripcion ?? '').toString().trim().toUpperCase();

    return col.tipoPago === 'I' &&
      desc.includes('MATERNIDAD');
  }

  private esRubroEnfermedadMensual(col: RubroColumnaResponse): boolean {
    const codigo = this.normalizarCodigoColumna(col.codigo);
    const desc = (col.descripcion ?? '').toString().trim().toUpperCase();

    return col.tipoPago === 'I' &&
      (
        desc.includes('ENFERMEDAD') ||
        codigo === '06' ||
        codigo === '49' ||
        codigo === '50' ||
        codigo === '52'
      );
  }

  private esRubroAccidenteMensual(col: RubroColumnaResponse): boolean {
    const codigo = this.normalizarCodigoColumna(col.codigo);
    const desc = (col.descripcion ?? '').toString().trim().toUpperCase();

    return col.tipoPago === 'I' &&
      (
        desc.includes('ACCIDENTE') ||
        codigo === '51' ||
        codigo === '53'
      );
  }

  private esBeneficioNoAportableMensual(col: RubroColumnaResponse): boolean {
    const codigo = this.normalizarCodigoColumna(col.codigo);
    const desc = (col.descripcion ?? '').toString().trim().toUpperCase();

    return codigo === '18' ||
      codigo === '45' ||
      codigo === '46' ||
      desc.includes('FONDO') ||
      desc.includes('DECIMO') ||
      desc.includes('DÉCIMO') ||
      desc.includes('ENFERMEDAD') ||
      desc.includes('ACCIDENTE');
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

abrirModalBanco(): void {
  const fechaPeriodo = this.formatearFechaYYYYMMDD(
    this.form.value.fechaPeriodo
  );

  const dialogRef = this.dialog.open(DialogBancoNominaComponent, {
    width: '470px',
    disableClose: true,
    data: {
      fechaPeriodo,
      idUsuario: this.usuarioActual?.id_usuario ?? 1
    }
  });

  /*
   * Generar Archivo:
   * Se ejecuta sin cerrar el modal.
   */
  dialogRef.componentInstance.archivoSolicitado.subscribe(
    (result: DialogBancoNominaResult) => {
      this.generarArchivoBancoDesdeModal(result);
    }
  );

  /*
   * Imprimir Reporte:
   * Este sí viene por afterClosed porque el modal se cierra.
   */
  dialogRef.afterClosed().subscribe(
    (result: DialogBancoNominaResult | null) => {
      if (!result) {
        return;
      }

      if (result.accion === 'REPORTE') {
        this.imprimirReporteFormaPagoDesdeModal(result);
        return;
      }
    }
  );
}
private generarArchivoBancoDesdeModal(result: DialogBancoNominaResult): void {
  const request = {
    fechaPeriodo: result.fechaPeriodo,
    codBanco: result.codBanco,
    descripcionPago: result.descripcionPago,
    idLocal: this.nodoSeleccionado?.tipo === 'LOCAL'
      ? this.nodoSeleccionado.id
      : null,
    idUsuario: result.idUsuario
  };

  this.actualizando = true;

  this.rolNominaService.generarArchivoBanco(request).subscribe({
    next: resp => {
      this.actualizando = false;

      if (resp.type !== 'Success' || !resp.data?.procesado) {
        this.mostrarAdvertencia(resp.message ?? 'No se pudo generar el archivo banco.');
        return;
      }

      this.descargarArchivoBancoBase64(
        resp.data.contenidoBase64,
        resp.data.nombreArchivo,
        resp.data.contentType
      );

      this.mostrarExito(resp.data.mensaje ?? 'Archivo generado correctamente.');
    },
    error: err => {
      this.actualizando = false;
      console.error(err);
      this.mostrarError('Error al generar el archivo banco.');
    }
  });
}
private imprimirReporteFormaPagoDesdeModal(result: DialogBancoNominaResult): void {
  const request = {
    fechaPeriodo: result.fechaPeriodo,
    codBanco: result.codBanco,
    descripcionPago: result.descripcionPago,
    idLocal: this.nodoSeleccionado?.tipo === 'LOCAL'
      ? this.nodoSeleccionado.id
      : null,
    idUsuario: result.idUsuario
  };

  this.actualizando = true;

  this.rolNominaService.imprimirReporteFormaPago(request).subscribe({
    next: blob => {
      this.actualizando = false;

      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 30000);
    },
    error: err => {
      this.actualizando = false;
      console.error(err);
      this.mostrarError('Error al imprimir el reporte de forma de pago.');
    }
  });
}
private descargarArchivoBancoBase64(
  contenidoBase64: string,
  nombreArchivo: string,
  contentType: string = 'text/plain'
): void {
  const byteCharacters = atob(contenidoBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], {
    type: contentType
  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();

  window.URL.revokeObjectURL(url);
}
}