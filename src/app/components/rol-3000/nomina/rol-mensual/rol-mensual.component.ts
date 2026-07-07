import { Component, OnInit } from '@angular/core';
import { DialogProcesoComponent } from 'src/app/components/productos/dialog-proceso/dialog-proceso.component';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
    private cierrePeriodoService: CierrePeriodoService
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
    nodoRaiz.expandido = true;
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
          estado: e.estado ?? '',
          idLocal: e.idLocal,
          local: e.local,
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

    let columnasIngresos: ColDef[] = columnasRubros
      .filter(x => x.tipoPago === 'I')
      .map(col => this.construirColumnaRubro(col, 'INGRESO'));
    columnasIngresos = this.ordenarColumnasIngresosConDias(columnasIngresos);
    const columnasDescuentos: ColDef[] = columnasRubros
      .filter(x => x.tipoPago === 'D')
      .map(col => this.construirColumnaRubro(col, 'DESCUENTO'));

    const grupoIngresos: ColGroupDef = {
      headerName: 'INGRESOS',
      headerClass: 'grupo-ingresos',
      children: columnasIngresos
    };

    const grupoDescuentos: ColGroupDef = {
      headerName: 'DESCUENTOS',
      headerClass: 'grupo-descuentos',
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

      rubrosTotales[key] = this.detalleRol.reduce((acc, item) => {
        const rubros = item.rubros ?? {};
        return acc + this.toNumber(rubros[key]);
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
      idUsuario: 1
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
  private ordenarColumnasIngresosConDias(columnas: ColDef[]): ColDef[] {
    const colSueldo = columnas.find(x => x.colId === '3I');
    const colValorDiasTrabajados = columnas.find(x => x.colId === '2I');

    const otrasColumnas = columnas.filter(x =>
      x.colId !== '3I' &&
      x.colId !== '2I'
    );

    const resultado: ColDef[] = [];

    // 1. SUELDO -> rubros["3I"]
    if (colSueldo) {
      resultado.push({
        ...colSueldo,
        headerName: 'SUELDO',
        width: 110,
        valueGetter: params => {
          const rubros = params.data?.rubros ?? {};
          return this.toNumber(rubros['3I']);
        },
        valueFormatter: params => this.formatearDecimalValor(params.value)
      });
    }

    // 2. VALOR DIAS TRAB. -> rubros["2I"]
    if (colValorDiasTrabajados) {
      resultado.push({
        ...colValorDiasTrabajados,
        headerName: 'VALOR DIAS TRAB.',
        width: 150,
        valueGetter: params => {
          const rubros = params.data?.rubros ?? {};
          return this.toNumber(rubros['2I']);
        },
        valueFormatter: params => this.formatearDecimalValor(params.value)
      });
    }

    // 3. DIAS TRAB. -> diasTrabajados
    resultado.push({
      headerName: 'DIAS TRAB.',
      colId: 'diasTrabajadosCantidad',
      width: 115,
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
      valueGetter: params => this.toNumber(params.data?.diasTrabajados),
      valueFormatter: params => this.formatearDecimalValor(params.value)
    });

    resultado.push(...otrasColumnas);

    return resultado;
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

    const filaHeader = 4;

    columnas.forEach((col, index) => {
      const cell = worksheet.getCell(filaHeader, index + 1);
      cell.value = col.headerName;
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
      cell.border = this.bordeExcel();
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.obtenerColorHeaderExcel(col) }
      };
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
          cell.numFmt = '#,##0.00';
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
          cell.numFmt = '#,##0.00';
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
      } else if (this.esColumnaTotalExcel(col)) {
        excelCol.width = 17;
      } else {
        excelCol.width = 15;
      }
    });

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: filaHeader,
        xSplit: 2
      }
    ];

    worksheet.autoFilter = {
      from: { row: filaHeader, column: 1 },
      to: { row: filaHeader, column: totalColumnas }
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

  return this.gridApi
    .getAllDisplayedColumns()
    .map(col => {
      const colDef = col.getColDef();

      return {
        colId: col.getColId(),
        field: colDef.field,
        headerName: colDef.headerName || col.getColId(),
        colDef
      };
    })
    .filter(col => col.colId !== 'seleccion');
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
    'nombreEmpleado'
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

  if (colId.endsWith('I') || colId === 'diasTrabajadosCantidad') {
    return 'FFDCFCE7';
  }

  if (colId.endsWith('D')) {
    return 'FFFEE2E2';
  }

  if (this.esColumnaTotalExcel(columna)) {
    return 'FFDBEAFE';
  }

  return 'FFF1F5F9';
}

private obtenerColorCeldaExcel(columna: any): string {
  const colId = columna.colId;

  if (colId.endsWith('I') || colId === 'diasTrabajadosCantidad') {
    return 'FFECFDF5';
  }

  if (colId.endsWith('D')) {
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

  if (colId.endsWith('I') || colId === 'diasTrabajadosCantidad') {
    return 'FFD9F99D';
  }

  if (colId.endsWith('D')) {
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

  if (colId.endsWith('I') || colId === 'diasTrabajadosCantidad') {
    return 'FF047857';
  }

  if (colId.endsWith('D')) {
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
}