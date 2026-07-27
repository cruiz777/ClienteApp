import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RpTipEmpService, RpTipEmpResponse } from 'src/app/services/rol/rp-tip-emp.service';

import { RpCargosService, RpCargoResponse } from 'src/app/services/rol/rp-cargos.service.service';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { DepartamentoResponse } from 'src/app/interfaces/responses/departamentos-response';
import { ZonaService, Zona } from 'src/app/services/zona.service';
import {
  EmpleadoEstructuraService,
  EmpleadoEstructuraResponse,
  FiltroEstructuraEmpleado
} from 'src/app/services/rol/empleado-estructura.service';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

type VistaFiltro = 'tipo' | 'departamento' | 'zona' | 'cargo';

interface Empleado {
  codigo: number;
  apellidosNombres: string;
  tipoEmpleado: string;
  centroCosto: string;
  departamento: string;
  cargo: string;
  zona: string;
  documento: string;
  ctaCble: string;
  fecIngreso: string;
}

interface TreeNode {
  id: string;
  label: string;
  filtro?: FiltroEstructuraEmpleado;
  idFiltro?: number;
  empleados?: Empleado[];
  children?: TreeNode[];
}

@Component({
  selector: 'app-estructura-empleados',
  templateUrl: './estructura-empleados.component.html',
  styleUrls: ['./estructura-empleados.component.css']
})
export class EstructuraEmpleadosComponent implements OnInit {

  form!: FormGroup;

  vistaActual: VistaFiltro = 'tipo';

  arbolActual: TreeNode[] = [];
  nodoSeleccionadoId: string | null = null;

  tiposEmpleado: RpTipEmpResponse[] = [];
  cargos: RpCargoResponse[] = [];
empleadosFiltrados: any[] = [];
  departamentos: DepartamentoResponse[] = [];
  zonas: Zona[] = [];
  idEmpresa = 1;

  columnas: string[] = [
    'codigo',
    'apellidosNombres',
    'tipoEmpleado',
    'centroCosto',
    'departamento',
    'cargo'
  ];



columnDefs: ColDef[] = [
  { field: 'codigo', headerName: 'Código', width: 100 },
  { field: 'apellidosNombres', headerName: 'Apellidos - Nombres', flex: 1, minWidth: 220 },
  { field: 'tipoEmpleado', headerName: 'Tipo Empleado', width: 160 },
  { field: 'departamento', headerName: 'Departamento', width: 160 },
  { field: 'cargo', headerName: 'Cargo', width: 160 },
  { field: 'zona', headerName: 'Zona', width: 140 },
  { field: 'documento', headerName: 'Documento', width: 140 },
  { field: 'ctaCble', headerName: 'Cuenta Cble', width: 140 ,hide: true},
  { field: 'fecIngreso', headerName: 'Fec. Ingreso', width: 130 }
];

defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true
};




  // Temporal hasta conectar empleados reales
  empleados: Empleado[] = [];

  constructor(
    private fb: FormBuilder,
    private rpTipEmpService: RpTipEmpService,
    private rpCargosService: RpCargosService,
    private departamentosService: DepartamentosService,
    private zonaService: ZonaService,
    private empleadoEstructuraService: EmpleadoEstructuraService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      vista: ['tipo']
    });

    this.form.get('vista')?.valueChanges.subscribe((valor: VistaFiltro) => {
      this.vistaActual = valor;
      this.nodoSeleccionadoId = null;
      this.empleadosFiltrados = [];
      this.cargarVista();
    });

    this.cargarTiposEmpleado();
    this.cargarCargos();
    this.cargarDepartamentos();
    this.cargarZonas();
  }

  cargarTiposEmpleado(): void {
    this.rpTipEmpService.getAll().subscribe({
      next: (data) => {
        this.tiposEmpleado = data ?? [];

        if (this.vistaActual === 'tipo') {
          this.arbolActual = this.generarArbolTiposDesdeApi();
        } else {
          this.cargarVista();
        }
      },
      error: (err) => {
        console.error('Error cargando tipos de empleado:', err);
        this.tiposEmpleado = [];
        this.cargarVista();
      }
    });
  }

  cargarVista(): void {
    this.nodoSeleccionadoId = null;
    this.empleadosFiltrados = [];

    switch (this.vistaActual) {
      case 'tipo':
        this.arbolActual = this.tiposEmpleado.length > 0
          ? this.generarArbolTiposDesdeApi()
          : this.generarArbolPorTipo();
        break;

      case 'departamento':
        this.arbolActual = this.departamentos.length > 0
          ? this.generarArbolDepartamentosDesdeApi()
          : this.generarArbolPorDepartamento();
        break;

      case 'zona':
        this.arbolActual = this.zonas.length > 0
          ? this.generarArbolZonasDesdeApi()
          : this.generarArbolPorZona();
        break;

      case 'cargo':
        this.arbolActual = this.cargos.length > 0
          ? this.generarArbolCargosDesdeApi()
          : this.generarArbolPorCargo();
        break;

      default:
        this.arbolActual = [];
        break;
    }
  }

seleccionarNodo(nodo: TreeNode): void {
  console.log('Nodo seleccionado:', nodo);

  this.nodoSeleccionadoId = nodo.id;
  this.empleadosFiltrados = [];

  if (!nodo.filtro || !nodo.idFiltro || nodo.idFiltro <= 0) {
    console.warn('Nodo sin filtro válido:', nodo);
    return;
  }

  this.empleadoEstructuraService.getByFiltro(nodo.filtro, nodo.idFiltro).subscribe({
    next: (data) => {
      console.log('Respuesta empleados:', data);

      this.empleadosFiltrados = (data ?? []).map(e => this.mapEmpleadoGrid(e));

      console.log('Datos para grid:', this.empleadosFiltrados);
    },
    error: (err) => {
      console.error('Error cargando empleados por estructura:', err);
      this.empleadosFiltrados = [];
    }
  });
}
  private generarArbolTiposDesdeApi(): TreeNode[] {
  return [
    {
      id: 'root-tipo',
      label: 'Lista de Empleados',
      children: this.tiposEmpleado
        .slice()
        .sort((a, b) => a.desTipemp.localeCompare(b.desTipemp))
        .map(tipo => ({
          id: `tipo-${tipo.idTipemp}`,
          label: tipo.desTipemp,
          filtro: 'tipo',
          idFiltro: tipo.idTipemp,
          empleados: []
        }))
    }
  ];
}

  private generarArbolPorTipo(): TreeNode[] {
    const tipos = this.obtenerValoresUnicos(this.empleados.map(e => e.tipoEmpleado));

    return [
      {
        id: 'root-tipo',
        label: 'Lista de Empleados',
        children: tipos.map(tipo => ({
          id: `tipo-${tipo}`,
          label: tipo,
          empleados: this.empleados.filter(e => e.tipoEmpleado === tipo)
        }))
      }
    ];
  }

  private generarArbolPorDepartamento(): TreeNode[] {
    const departamentos = this.obtenerValoresUnicos(this.empleados.map(e => e.departamento));

    return [
      {
        id: 'root-departamento',
        label: 'Departamentos',
        children: departamentos.map(dep => ({
          id: `departamento-${dep}`,
          label: dep,
          empleados: this.empleados.filter(e => e.departamento === dep)
        }))
      }
    ];
  }

  private generarArbolPorZona(): TreeNode[] {
    return [
      {
        id: 'root-zona',
        label: 'Zonas',
        children: []
      }
    ];
  }

  private generarArbolPorCargo(): TreeNode[] {
    const cargos = this.obtenerValoresUnicos(this.empleados.map(e => e.cargo));

    return [
      {
        id: 'root-cargo',
        label: 'Cargos',
        children: cargos.map(cargo => ({
          id: `cargo-${cargo}`,
          label: cargo,
          empleados: this.empleados.filter(e => e.cargo === cargo)
        }))
      }
    ];
  }

  private obtenerValoresUnicos(valores: string[]): string[] {
    return [...new Set(
      valores
        .map(v => (v ?? '').trim())
        .filter(v => v.length > 0)
    )].sort((a, b) => a.localeCompare(b));
  }

  private normalizar(valor: string): string {
    return (valor ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  cargarCargos(): void {
    this.rpCargosService.getAll().subscribe({
      next: (data) => {
        this.cargos = data ?? [];

        if (this.vistaActual === 'cargo') {
          this.arbolActual = this.generarArbolCargosDesdeApi();
        }
      },
      error: (err) => {
        console.error('Error cargando cargos:', err);
        this.cargos = [];
      }
    });
  }
private generarArbolCargosDesdeApi(): TreeNode[] {
  return [
    {
      id: 'root-cargo',
      label: 'Cargos',
      children: this.cargos
        .slice()
        .sort((a, b) => a.descargo.localeCompare(b.descargo))
        .map(cargo => ({
          id: `cargo-${cargo.idCargo}`,
          label: cargo.descargo,
          filtro: 'cargo',
          idFiltro: cargo.idCargo,
          empleados: []
        }))
    }
  ];
}
cargarDepartamentos(): void {
  this.departamentosService.getDepartamentos().subscribe({
    next: (data) => {
      this.departamentos = data ?? [];

      if (this.vistaActual === 'departamento') {
        this.arbolActual = this.generarArbolDepartamentosDesdeApi();
      }
    },
    error: (err) => {
      console.error('Error cargando departamentos:', err);
      this.departamentos = [];
    }
  });
}

  cargarZonas(): void {
    this.zonaService.obtenerZona().subscribe({
      next: (data) => {
        this.zonas = data ?? [];

        if (this.vistaActual === 'zona') {
          this.arbolActual = this.generarArbolZonasDesdeApi();
        }
      },
      error: (err) => {
        console.error('Error cargando zonas:', err);
        this.zonas = [];
      }
    });
  }
private generarArbolDepartamentosDesdeApi(): TreeNode[] {
  return [
    {
      id: 'root-departamento',
      label: 'Departamentos',
      children: this.departamentos
        .slice()
        .sort((a: any, b: any) =>
          (a.descripcion ?? a.Descripcion ?? a.nombre ?? a.Nombre ?? '')
            .localeCompare(b.descripcion ?? b.Descripcion ?? b.nombre ?? b.Nombre ?? '')
        )
        .map((dep: any) => {
          const idDepartamento = Number(
            dep.idDepartamento ??
            dep.IdDepartamento ??
            dep.id_departamento ??
            0
          );

          const nombreDepartamento =
            dep.descripcion ??
            dep.Descripcion ??
            dep.nombre ??
            dep.Nombre ??
            'SIN NOMBRE';

          return {
            id: `departamento-${idDepartamento}`,
            label: nombreDepartamento,
            filtro: 'departamento',
            idFiltro: idDepartamento,
            empleados: []
          };
        })
    }
  ];
}
private generarArbolZonasDesdeApi(): TreeNode[] {
  return [
    {
      id: 'root-zona',
      label: 'Zonas',
      children: this.zonas
        .slice()
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(zona => ({
          id: `zona-${zona.id}`,
          label: zona.nombre,
          filtro: 'zona',
          idFiltro: zona.id,
          empleados: []
        }))
    }
  ];
}
  private mapEmpleadoGrid(e: EmpleadoEstructuraResponse): Empleado {
  return {
    codigo: e.idEmpleado,
    apellidosNombres: e.nombre ?? '',
    tipoEmpleado: e.tipoEmpleado ?? '',
    centroCosto: e.ctaCble ?? '',
    departamento: e.departamento ?? '',
    cargo: e.cargo ?? '',
    zona: e.zona ?? '',
    documento: e.documento ?? '',
    ctaCble: e.ctaCble ?? '',
    fecIngreso: e.fecIngreso ?? ''
  };
}
}