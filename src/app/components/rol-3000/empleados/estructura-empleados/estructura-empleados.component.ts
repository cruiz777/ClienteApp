import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

type VistaFiltro = 'tipo' | 'departamento' | 'zona' | 'cargo';

interface Empleado {
  codigo: number;
  apellidosNombres: string;
  tipoEmpleado: string;
  centroCosto: string;
  departamento: string;
  cargo: string;
  zona: string;
}

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  empleados?: Empleado[];
}

@Component({
  selector: 'app-estructura-empleados',
  templateUrl: './estructura-empleados.component.html',
  styleUrls: ['./estructura-empleados.component.css']
})
export class EstructuraEmpleadosComponent implements OnInit {
  form!: FormGroup;

  vistaActual: VistaFiltro = 'tipo';

  columnas: string[] = [
    'codigo',
    'apellidosNombres',
    'tipoEmpleado',
    'centroCosto',
    'departamento',
    'cargo'
  ];

  empleadosFiltrados: Empleado[] = [];
  arbolActual: TreeNode[] = [];
  nodoSeleccionadoId: string | null = null;

  // Datos de prueba
  empleadosMock: Empleado[] = [
    {
      codigo: 116,
      apellidosNombres: 'ABATA BAUTISTA AMPARO DEL ROCIO',
      tipoEmpleado: 'Exempleados',
      centroCosto: 'CLINICO',
      departamento: 'AUXILIARES DE ENFERMERÍA',
      cargo: 'AUXILIAR 2 - AUX. ENFERMERIA',
      zona: 'QUITO'
    },
    {
      codigo: 1321,
      apellidosNombres: 'ABENDAÑO ANIEMA BRYAN JORDAN',
      tipoEmpleado: 'Exempleados',
      centroCosto: 'CLINICO',
      departamento: 'RADIOLOGÍA',
      cargo: 'TECNOLOGO',
      zona: 'QUITO'
    },
    {
      codigo: 738,
      apellidosNombres: 'ABRIL MAZA LORENA VIVIANA',
      tipoEmpleado: 'Fijos',
      centroCosto: 'CLINICO',
      departamento: 'ENFERMERÍA',
      cargo: 'ENFERMERA',
      zona: 'CUENCA'
    },
    {
      codigo: 238,
      apellidosNombres: 'ALMACHE POZO SABINA ESTHER',
      tipoEmpleado: 'Fijos',
      centroCosto: 'CLINICO',
      departamento: 'AUXILIARES DE ENFERMERÍA',
      cargo: 'AUXILIAR ENFERMERIA',
      zona: 'GUAYAQUIL'
    },
    {
      codigo: 31,
      apellidosNombres: 'AYALA ARIAS JAIME EDUARDO',
      tipoEmpleado: 'Fijos',
      centroCosto: 'ADMINISTRATIVO',
      departamento: 'ADMISION',
      cargo: 'ADMISIONISTA',
      zona: 'QUITO'
    },
    {
      codigo: 78,
      apellidosNombres: 'MARCILLO GUERRERO SANDRA SOLEDAD',
      tipoEmpleado: 'Fijos',
      centroCosto: 'ADMINISTRATIVO',
      departamento: 'ADMISION',
      cargo: 'ASISTENTE ADMINISTRATIVO',
      zona: 'QUITO'
    },
    {
      codigo: 547,
      apellidosNombres: 'ALAVA TRIVIÑO WALTER FREDDY',
      tipoEmpleado: 'Fijos',
      centroCosto: 'CLINICO',
      departamento: 'AUXILIARES DE ENFERMERÍA',
      cargo: 'AUXILIAR ENFERMERIA',
      zona: 'QUITO'
    },
    {
      codigo: 255,
      apellidosNombres: 'ACEVEDO COLLANTES BYRON RAMIRO',
      tipoEmpleado: 'Exempleados',
      centroCosto: 'CLINICO',
      departamento: 'DIRECCION',
      cargo: 'DIRECTORA GENERAL',
      zona: 'QUITO'
    },
    {
      codigo: 622,
      apellidosNombres: 'ACOSTA ESPIN PATRICIO ERNESTO',
      tipoEmpleado: 'Exempleados',
      centroCosto: 'CLINICO',
      departamento: 'MEDICOS GENERAL',
      cargo: 'MEDICO RESIDENTE',
      zona: 'GUAYAQUIL'
    },
    {
      codigo: 100,
      apellidosNombres: 'ACARO PEREZ CARMEN DELCIA',
      tipoEmpleado: 'Exempleados',
      centroCosto: 'CLINICO',
      departamento: 'DIRECCION',
      cargo: 'DIRECTORA GENERAL',
      zona: 'CUENCA'
    },
    {
      codigo: 564,
      apellidosNombres: 'AGUILAR VILLALVA VICTOR MARCELO',
      tipoEmpleado: 'Fijos',
      centroCosto: 'CLINICO',
      departamento: 'MEDICOS GENERAL',
      cargo: 'MEDICO RESIDENTE',
      zona: 'QUITO'
    },
    {
      codigo: 1284,
      apellidosNombres: 'ALBAN RAMOS SHIRLEY DAYANA',
      tipoEmpleado: 'Temporal / Becario',
      centroCosto: 'PASANTES O BECARIOS',
      departamento: 'CONTABILIDAD',
      cargo: 'PASANTE',
      zona: 'QUITO'
    },
    {
      codigo: 1294,
      apellidosNombres: 'ALBARRAN DIAZ DARWIN DAVID',
      tipoEmpleado: 'Por Horas',
      centroCosto: 'SERVICIOS',
      departamento: 'DIETETICA Y LAVANDERÍA',
      cargo: 'AUXILIAR 1 - AUX. DIET. Y LAV.',
      zona: 'QUITO'
    },
    {
      codigo: 1303,
      apellidosNombres: 'ALMACHE LAGLAGUNO MATEO SEBASTIAN',
      tipoEmpleado: 'Por Horas',
      centroCosto: 'SERVICIOS',
      departamento: 'DIETETICA Y LAVANDERÍA',
      cargo: 'AUXILIAR 1 - AUX. DIET. Y LAV.',
      zona: 'GUAYAQUIL'
    }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      vista: ['tipo']
    });

    this.form.get('vista')?.valueChanges.subscribe((valor: VistaFiltro) => {
      this.vistaActual = valor;
      this.cargarVista();
    });

    this.cargarVista();
  }

  cargarVista(): void {
    this.nodoSeleccionadoId = null;
    this.empleadosFiltrados = [];

    switch (this.vistaActual) {
      case 'tipo':
        this.arbolActual = this.generarArbolPorTipo();
        break;
      case 'departamento':
        this.arbolActual = this.generarArbolPorDepartamento();
        break;
      case 'zona':
        this.arbolActual = this.generarArbolPorZona();
        break;
      case 'cargo':
        this.arbolActual = this.generarArbolPorCargo();
        break;
    }
  }

  seleccionarNodo(node: TreeNode): void {
    this.nodoSeleccionadoId = node.id;
    this.empleadosFiltrados = node.empleados ? [...node.empleados] : [];
  }

  salir(): void {
    console.log('Salir...');
    // Aquí luego puedes navegar o cerrar diálogo
  }

  // =============================
  // Generadores de árbol
  // =============================

  private generarArbolPorTipo(): TreeNode[] {
    const tipos = this.groupBy(this.empleadosMock, e => e.tipoEmpleado);

    return [
      {
        id: 'root-tipo',
        label: 'Lista de Empleados',
        children: Object.keys(tipos)
          .sort()
          .map(tipo => ({
            id: `tipo-${tipo}`,
            label: tipo,
            empleados: tipos[tipo]
          }))
      }
    ];
  }

  private generarArbolPorDepartamento(): TreeNode[] {
    const departamentos = this.groupBy(this.empleadosMock, e => e.departamento);

    return [
      {
        id: 'root-departamento',
        label: 'Empleados por Departamentos',
        children: Object.keys(departamentos)
          .sort()
          .map(dep => ({
            id: `dep-${dep}`,
            label: dep,
            empleados: departamentos[dep]
          }))
      }
    ];
  }

  private generarArbolPorCargo(): TreeNode[] {
    const cargos = this.groupBy(this.empleadosMock, e => e.cargo);

    return [
      {
        id: 'root-cargo',
        label: 'Empleados por Cargo',
        children: Object.keys(cargos)
          .sort()
          .map(cargo => ({
            id: `cargo-${cargo}`,
            label: cargo,
            empleados: cargos[cargo]
          }))
      }
    ];
  }

  private generarArbolPorZona(): TreeNode[] {
    const zonas = this.groupBy(this.empleadosMock, e => e.zona);

    return [
      {
        id: 'root-zona',
        label: 'Empleados por Zona',
        children: Object.keys(zonas)
          .sort()
          .map(zona => {
            const empleadosZona = zonas[zona];
            const departamentosZona = this.groupBy(empleadosZona, e => e.centroCosto);

            return {
              id: `zona-${zona}`,
              label: zona,
              children: Object.keys(departamentosZona)
                .sort()
                .map(centro => ({
                  id: `zona-${zona}-centro-${centro}`,
                  label: centro,
                  empleados: departamentosZona[centro]
                }))
            };
          })
      }
    ];
  }

  private groupBy<T>(array: T[], keyGetter: (item: T) => string): Record<string, T[]> {
    return array.reduce((result: Record<string, T[]>, currentItem: T) => {
      const key = keyGetter(currentItem);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(currentItem);
      return result;
    }, {});
  }
}