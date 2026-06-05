import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import {
  GenerarRolMensualRequest,
  RolNominaService
} from 'src/app/services/rol/rol-nomina.service';

interface NodoRol {
  id: number;
  nombre: string;
  tipo: 'GENERAL' | 'LOCAL' | 'DEPARTAMENTO';
}

interface RolDetalle {
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

  fondoReserva?: number | null;
  decimoTercero?: number | null;
  decimoCuarto?: number | null;
  aporteIess?: number | null;
  totalIngresos?: number | null;
  totalDescuentos?: number | null;
  liquidoRecibir?: number | null;
}

@Component({
  selector: 'app-rol-mensual',
  templateUrl: './rol-mensual.component.html',
  styleUrls: ['./rol-mensual.component.css']
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
  { field: 'estado', headerName: 'Estado', width: 100 },

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
    private rolNominaService: RolNominaService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      verLocales: [true],
      areas: [true],
      exEmpleados: [true],
      departamentos: [false],
      fechaPeriodo: ['2026-01-31'],

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
        id: 0,
        nombre: 'Emisión de Roles',
        tipo: 'GENERAL'
      }
    ];

    this.nodoSeleccionado = this.nodos[0];

    this.detalleRol = [];
  }

  seleccionarNodo(nodo: NodoRol): void {
    this.nodoSeleccionado = nodo;
  }

  nuevo(): void {
  if (!this.form.value.fechaPeriodo) {
    alert('Debe ingresar el periodo.');
    return;
  }

  const request = this.construirRequestGenerar(false);

  this.generando = true;

  this.rolNominaService.generarRolMensual(request).subscribe({
    next: (resp) => {
      this.generando = false;

      if (resp.type === 'Success') {
        alert(resp.message);
        this.cargarRolMensual();
        return;
      }

      if (resp.type === 'Warning') {
        const confirmar = confirm(`${resp.message}\n\n¿Desea sobrescribir el periodo?`);

        if (confirmar) {
          this.generarSobrescribiendo();
        }

        return;
      }

      alert(resp.message);
    },
    error: (err) => {
      this.generando = false;
      console.error('Error al generar nómina:', err);
      alert('Error al generar la nómina mensual.');
    }
  });
}
  private generarSobrescribiendo(): void {
  const request = this.construirRequestGenerar(true);

  this.generando = true;

  this.rolNominaService.generarRolMensual(request).subscribe({
    next: (resp) => {
      this.generando = false;
      alert(resp.message);

      if (resp.type === 'Success') {
        this.cargarRolMensual();
      }
    },
    error: (err) => {
      this.generando = false;
      console.error('Error al sobrescribir nómina:', err);
      alert('Error al sobrescribir la nómina mensual.');
    }
  });
}

  private construirRequestGenerar(sobrescribir: boolean): GenerarRolMensualRequest {
    const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

    return {
      fechaPeriodo: this.form.value.fechaPeriodo,

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

  actualizar(): void {
    console.log('Actualizar', this.form.value);
  }

  cargarHoras(): void {
    console.log('Cargar Horas');
  }

  rubrosFijos(): void {
    console.log('Rubros Fijos');
  }

  cancelar(): void {
    console.log('Cancelar');
  }

  calcularTotal(columna: keyof RolDetalle): number {
    return this.detalleRol.reduce((acc, item) => {
      const valor = item[columna];
      return acc + (typeof valor === 'number' ? valor : 0);
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
    codigo: Number(e.codigoEmpleado ?? e.idEmpleado),
    nombre: e.nombreEmpleado ?? '',
    estado: e.estado ?? '',

    // I-2
    diasTrabajados: this.obtenerRubro(rubros, '2I'),

    // I-3
    sueldo: this.obtenerRubro(rubros, '3I'),

    // todavía no están generados en tu handler actual, pero quedan preparados
    maternidad: this.obtenerRubro(rubros, '5I'),
    recargoNocturno: null,
    horasExtras25: this.obtenerRubro(rubros, '8I'),
    horasExtras50: this.obtenerRubro(rubros, '9I'),
    horasExtras100: this.obtenerRubro(rubros, '10I'),

    // D-25
    aporteIess: this.obtenerRubro(rubros, '25D'),

    // I-18
    fondoReserva: this.obtenerRubro(rubros, '18I'),

    // I-46
    decimoTercero: this.obtenerRubro(rubros, '46I'),

    // I-45
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

private construirRequestConsulta() {
  const tipoNodo = this.nodoSeleccionado?.tipo ?? 'GENERAL';

  return {
    fechaPeriodo: this.form.value.fechaPeriodo,

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
}