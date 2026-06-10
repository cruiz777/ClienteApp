import { Component, OnInit } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { RolIndividualDialogComponent } from '../rol-individual-dialog/rol-individual-dialog.component';
import { LocalesService } from 'src/app/services/locales.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
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
  RolNominaService
} from 'src/app/services/rol/rol-nomina.service';

interface NodoRol {
  id: number | null;
  nombre: string;
  tipo: 'GENERAL' | 'LOCAL' | 'DEPARTAMENTO';
  expandido?: boolean;
  hijos?: NodoRol[];
}

interface RolDetalle {
  idEmpleado: number;

  codigo: number;
  nombre: string;
  estado: string;

  diasTrabajados: number | null;
  sueldo: number | null;

  maternidad: number | null;
  recargoNocturno: number | null;
  horasExtras25: number | null;
  horasExtras50: number | null;
  horasExtras100: number | null;

  aporteIess: number | null;
  fondoReserva: number | null;
  decimoTercero: number | null;
  decimoCuarto: number | null;

  totalIngresos: number | null;
  totalDescuentos: number | null;
  liquidoRecibir: number | null;
}
export const DD_MM_YYYY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
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

  detalleRol: RolDetalle[] = [];

  generando = false;
  cargando = false;

columnDefs: ColDef[] = [
  { field: 'codigo', headerName: 'Código', width: 100, pinned: 'left' },
  { field: 'nombre', headerName: 'Nombre', minWidth: 260, flex: 1, pinned: 'left' },
  //{ field: 'estado', headerName: 'Estado', width: 100 },

  {
    field: 'diasTrabajados',
    headerName: 'Días Trabajados',
    width: 150,
    type: 'numericColumn'
  },
  {
    field: 'sueldo',
    headerName: 'Sueldo',
    width: 120,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'aporteIess',
    headerName: 'Aporte IESS',
    width: 130,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'fondoReserva',
    headerName: 'Fondo Reserva',
    width: 140,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'decimoTercero',
    headerName: 'Décimo Tercero',
    width: 150,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'decimoCuarto',
    headerName: 'Décimo Cuarto',
    width: 150,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'totalIngresos',
    headerName: 'Total Ingresos',
    width: 150,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'totalDescuentos',
    headerName: 'Total Descuentos',
    width: 160,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  },
  {
    field: 'liquidoRecibir',
    headerName: 'Líquido a Recibir',
    width: 170,
    type: 'numericColumn',
    valueFormatter: this.formatearDecimal
  }
];
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

  this.cargarLocalesArbol();
}
 seleccionarNodo(nodo: NodoRol): void {
  this.nodoSeleccionado = nodo;
  this.cargarRolMensual();
}
nuevo(): void {
  if (!this.form.value.fechaPeriodo) {
    this.mostrarAdvertencia('Debe ingresar el periodo.');
    return;
  }

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
private generarSobrescribiendo(): void {
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

  if (this.nodos.length > 0) {
    this.nodos[0].expandido = false;
    this.nodoSeleccionado = this.nodos[0];
  }

  this.generando = false;
  this.cargando = false;
}

 calcularTotal(columna: keyof RolDetalle): number {
  return this.detalleRol.reduce((acc, item) => {
    const valor = item[columna];

    if (typeof valor === 'number') {
      return acc + valor;
    }

    return acc;
  }, 0);
}

  private formatearNumero(params: any): string {
    if (params.value === null || params.value === undefined) {
      return '';
    }

    return Number(params.value).toString();
  }

  private formatearDecimal(params: any): string {
    if (params.value === null || params.value === undefined) {
      return '';
    }

    return Number(params.value).toFixed(2);
  }
  cargarRolMensual(): void {
  if (!this.form.value.fechaPeriodo) {
    alert('Debe ingresar el periodo.');
    return;
  }

  const request = this.construirRequestConsulta();

  this.cargando = true;

  this.rolNominaService.getRolMensual(request).subscribe({
    next: (resp) => {
      this.cargando = false;

      if (resp.type !== 'Success') {
        alert(resp.message);
        this.detalleRol = [];
        return;
      }

      const empleados = resp.data?.empleados ?? [];

      this.detalleRol = empleados.map(e => this.mapRolEmpleadoGrid(e));
    },
    error: (err) => {
      this.cargando = false;
      console.error('Error cargando rol mensual:', err);
      alert('Error al cargar el rol mensual.');
      this.detalleRol = [];
    }
  });
}
private mapRolEmpleadoGrid(e: any): RolDetalle {
  const rubros = e.rubros ?? {};

  return {
    idEmpleado: Number(e.idEmpleado),

    codigo: Number(e.codigoEmpleado ?? e.idEmpleado),
    nombre: e.nombreEmpleado ?? '',
    estado: e.estado ?? '',

    diasTrabajados: this.obtenerRubro(rubros, '2I'),
    sueldo: this.obtenerRubro(rubros, '3I'),

    maternidad: this.obtenerRubro(rubros, '5I'),
    recargoNocturno: this.obtenerRubro(rubros, '7I'),
    horasExtras25: this.obtenerRubro(rubros, '8I'),
    horasExtras50: this.obtenerRubro(rubros, '9I'),
    horasExtras100: this.obtenerRubro(rubros, '10I'),

    aporteIess: this.obtenerRubro(rubros, '25D'),
    fondoReserva: this.obtenerRubro(rubros, '18I'),
    decimoTercero: this.obtenerRubro(rubros, '46I'),
    decimoCuarto: this.obtenerRubro(rubros, '45I'),

    totalIngresos: e.totalIngresos ?? 0,
    totalDescuentos: e.totalDescuentos ?? 0,
    liquidoRecibir: e.liquidoRecibir ?? 0
  };
}


private obtenerRubro(rubros: Record<string, number>, key: string): number | null {
  const valor = rubros[key];

  if (valor === undefined || valor === null) {
    return null;
  }

  return Number(valor);
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

    idUsuario: 1,
    sobrescribir
  };
}
abrirRolIndividual(event: any): void {
  const row = event.data as RolDetalle;

  if (!row || !row.idEmpleado) {
    this.mostrarAdvertencia('No se pudo identificar el empleado.');
    return;
  }

  const fechaPeriodo = this.formatearFechaYYYYMMDD(this.form.value.fechaPeriodo);

  if (!fechaPeriodo) {
    this.mostrarAdvertencia('Debe seleccionar el periodo.');
    return;
  }

  this.dialog.open(RolIndividualDialogComponent, {
    width: '1180px',
    maxWidth: '98vw',
    height: '90vh',
    maxHeight: '95vh',
    panelClass: 'rol-individual-dialog-panel',
    data: {
      idEmpleado: row.idEmpleado,
      fechaPeriodo
    },
    disableClose: false
  });
}
private obtenerUltimoDiaMesActual(): Date {
  const hoy = new Date();

  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}
validarUltimoDiaMes(control: AbstractControl): ValidationErrors | null {
  const fecha = control.value;

  if (!fecha) return null;

  const date = new Date(fecha);

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
  if (!fecha) return false;

  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  return fecha.getDate() === ultimoDia;
};
private formatearFechaDDMMYYYY(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}
private construirRequestConsulta() {
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
private formatearFechaYYYYMMDD(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}
private cargarLocalesArbol(): void {
  this.localesService.getAll().subscribe({
    next: (response) => {
      const locales = response.data ?? [];

      const raiz = this.nodos[0];

      raiz.hijos = locales.map(local => ({
        id: Number(local.id),
        nombre: local.nombre ?? `Local ${local.id}`,
        tipo: 'LOCAL' as const,
        expandido: false,
        hijos: []
      }));
    },
    error: (err) => {
      console.error('Error cargando locales:', err);
      alert('No se pudieron cargar los locales.');
    }
  });
}
toggleNodo(nodo: NodoRol, event: MouseEvent): void {
  event.stopPropagation();
  nodo.expandido = !nodo.expandido;
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
}