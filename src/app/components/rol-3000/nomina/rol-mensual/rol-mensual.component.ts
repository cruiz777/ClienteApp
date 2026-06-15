import { Component, OnInit } from '@angular/core';
import { ColDef, ColGroupDef, ValueFormatterParams } from 'ag-grid-community';
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
  RolNominaService
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

  /*
   * Este arreglo alimenta el AG Grid.
   * Ahora es dinámico porque cada fila tiene:
   * - datos base
   * - rubros: Record<string, number>
   */
  detalleRol: any[] = [];

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
  ) {}

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

  if (nodo.tipo === 'GENERAL') {
    this.detalleRol = [];
    this.columnasRubros = [];
    this.columnDefs = this.construirColumnasGrid([]);
    return;
  }

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

  const request = this.construirRequestGenerar(true);

  this.generando = true;

  this.rolNominaService.generarRolMensual(request).subscribe({
    next: (resp) => {
      this.generando = false;

      if (resp.type === 'Success') {
        this.mostrarExito(resp.message ?? 'Nómina regenerada correctamente.');
        this.cargarRolMensual();
        return;
      }

      this.mostrarAdvertencia(resp.message ?? 'No se pudo sobrescribir la nómina.');
    },
    error: (err) => {
      this.generando = false;
      console.error('Error al sobrescribir nómina:', err);
      this.mostrarError('Error al sobrescribir la nómina mensual.');
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
    console.log('Cargar Horas');
  }

  rubrosFijos(): void {
    console.log('Rubros Fijos');
  }

cancelar(): void {
  this.form.reset({
    verLocales: true,
    areas: true,
    exEmpleados: true,
    departamentos: false,
    fechaPeriodo: this.obtenerUltimoDiaMesActual(),
    totalizados: false,
    porRubros: false,
    todosLosRubros: true,
    totalizar: false
  });

  this.detalleRol = [];
  this.columnasRubros = [];
  this.columnDefs = this.construirColumnasGrid([]);
  this.pinnedBottomRowData = [];

  if (this.nodos.length > 0) {
    this.nodos[0].expandido = false;
    this.nodoSeleccionado = this.nodos[0];
  }

  this.generando = false;
  this.cargando = false;
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
    },
    error: (err) => {
      this.cargando = false;
      console.error('Error cargando rol mensual:', err);
      this.mostrarError('Error al cargar el rol mensual.');
      this.detalleRol = [];
      this.columnasRubros = [];
      this.columnDefs = this.construirColumnasGrid([]);
      this.pinnedBottomRowData = [];
    }
  });
}

private construirColumnasGrid(columnasRubros: RubroColumnaResponse[]): Array<ColDef | ColGroupDef> {
  const columnasBase: ColDef[] = [
    {
      field: 'codigoEmpleado',
      headerName: 'Código',
      width: 90,
      pinned: 'left',
      filter: true,
      cellClass: params =>
        params.node?.rowPinned ? 'cell-total-label' : ''
    },
    {
      field: 'nombreEmpleado',
      headerName: 'Nombre',
      minWidth: 260,
      flex: 1,
      pinned: 'left',
      filter: true,
      cellClass: params =>
        params.node?.rowPinned ? 'cell-total-label' : ''
    }
  ];

  const columnasIngresos: ColDef[] = columnasRubros
    .filter(x => x.tipoPago === 'I')
    .map(col => this.construirColumnaRubro(col, 'INGRESO'));

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
    ...columnasBase,
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
  if (this.periodoCerrado) {
    this.mostrarAdvertencia(
      'El periodo está cerrado. No se permite modificar la nómina individual.'
    );
    return;
  }

  const row = event.data;

  if (!row || !row.idEmpleado) {
    this.mostrarAdvertencia('No se pudo identificar el empleado.');
    return;
  }

  const fechaPeriodo = this.formatearFechaYYYYMMDD(
    this.form.value.fechaPeriodo
  );

  if (!fechaPeriodo) {
    this.mostrarAdvertencia('Debe seleccionar el periodo.');
    return;
  }

  const dialogRef = this.dialog.open(RolIndividualDialogComponent, {
    width: '1180px',
    maxWidth: '98vw',
    height: '90vh',
    maxHeight: '95vh',
    panelClass: 'rol-individual-dialog-panel',
    data: {
      idEmpleado: row.idEmpleado,
      fechaPeriodo,
      soloLectura: this.periodoCerrado
    },
    disableClose: false
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

    verLocales: this.form.value.verLocales ?? true,
    areas: this.form.value.areas ?? true,
    exEmpleados: this.form.value.exEmpleados ?? true,

    departamentos: this.form.value.departamentos ?? false,
    totalizados: this.form.value.totalizados ?? false,
    porRubros: this.form.value.porRubros ?? false,
    todosLosRubros: this.form.value.todosLosRubros ?? true,
    totalizar: this.form.value.totalizar ?? false
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
    diasTrabajados: 0,
    rubros: rubrosTotales,
    totalIngresos,
    totalDescuentos,
    liquidoRecibir
  };
}
private generarRolMensualNuevo(): void {
  const request = this.construirRequestGenerar(false);

  this.generando = true;

  this.rolNominaService.generarRolMensual(request).subscribe({
    next: (resp) => {
      this.generando = false;

      if (resp.type === 'Success') {
        this.mostrarExito(resp.message ?? 'Nómina generada correctamente.');
        this.cargarRolMensual();
        return;
      }

      if (resp.type === 'Warning') {
        this.confirmarAccion(
          'Periodo ya generado',
          `${resp.message}\n\n¿Desea sobrescribir el periodo?`,
          'Sí, sobrescribir',
          'Cancelar'
        ).subscribe((confirmado: boolean) => {
          if (confirmado === true) {
            this.generarSobrescribiendo();
            return;
          }

          this.cargarRolMensual();
        });

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
}