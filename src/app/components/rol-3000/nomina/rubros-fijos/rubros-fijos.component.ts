import { Component, OnInit } from '@angular/core';

interface TreeNode {
  id: number;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
}

interface RubroFijoDetalle {
  id: number;
  codigo: number;
  nombre: string;
  valor: number | null;
  noCuenta: string;
  cuentaPagada: string;
  observaciones: string;
}

@Component({
  selector: 'app-rubros-fijos',
  templateUrl: './rubros-fijos.component.html',
  styleUrls: ['./rubros-fijos.component.css']
})
export class RubrosFijosComponent implements OnInit {
  localesTree: TreeNode[] = [];
  rubrosTree: TreeNode[] = [];

  displayedColumns: string[] = [
    'id',
    'codigo',
    'nombre',
    'valor',
    'noCuenta',
    'cuentaPagada',
    'observaciones'
  ];

  dataSource: RubroFijoDetalle[] = [];

  ngOnInit(): void {
    this.cargarMock();
  }

  cargarMock(): void {
    this.localesTree = [
      {
        id: 1,
        label: 'Listado de Locales',
        expanded: true,
        checked: false,
        children: [
          { id: 11, label: 'Administrativo', checked: true },
          { id: 12, label: 'Clínico', checked: true },
          { id: 13, label: 'Pasantes o Becarios', checked: true },
          { id: 14, label: 'Servicios', checked: true }
        ]
      }
    ];

    this.rubrosTree = [
      {
        id: 100,
        label: 'Egresos',
        expanded: true,
        children: [
          { id: 101, label: 'Abeferm S.A.' },
          { id: 102, label: 'Ajuste Imp renta' },
          { id: 103, label: 'Anticipo' },
          { id: 104, label: 'Anticipo Quincenal' },
          { id: 105, label: 'Aporte IESS' },
          { id: 106, label: 'Arriendo' }
        ]
      },
      {
        id: 200,
        label: 'Ingresos',
        expanded: false,
        children: []
      }
    ];

    this.dataSource = [
      {
        id: 1,
        codigo: 1427,
        nombre: 'Arbulufo Ibáñez Nora Tatiana',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 2,
        codigo: 31,
        nombre: 'Ayala Arias Jaime Eduardo',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 3,
        codigo: 1437,
        nombre: 'Bautista Pérez Gina Marilu',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 4,
        codigo: 1167,
        nombre: 'Bustillos Espín Eduardo Luis',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 5,
        codigo: 1460,
        nombre: 'Cadena Chivita Edgar Rodolfo',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 6,
        codigo: 849,
        nombre: 'Cadena Jaramillo Tarin Iveth',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 7,
        codigo: 1103,
        nombre: 'Cañada Manzano Cecilia Lorena',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 8,
        codigo: 697,
        nombre: 'Chicaiza Cabrera Elizabeth Alexandra',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      },
      {
        id: 9,
        codigo: 629,
        nombre: 'Cisneros Mera Israel Jonatan',
        valor: null,
        noCuenta: '',
        cuentaPagada: '',
        observaciones: ''
      }
    ];
  }

  toggleNode(node: TreeNode): void {
    node.expanded = !node.expanded;
  }

  toggleCheck(node: TreeNode): void {
    node.checked = !node.checked;
  }

  cargarEmpleados(): void {
    console.log('Cargar empleados');
  }

  cargarGlobal(): void {
    console.log('Cargar global');
  }

  nuevo(): void {
    console.log('Nuevo');
  }

  grabar(): void {
    console.log('Grabar');
  }

  exportar(): void {
    console.log('Exportar');
  }

  cancelar(): void {
    console.log('Cancelar');
  }
}