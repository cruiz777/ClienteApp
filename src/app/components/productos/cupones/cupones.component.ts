import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

interface Cupon {
  cupon: string;
  prefijo: string;
  descripcion: string;
  categoria: string;
  fecha: string;
}

@Component({
  selector: 'app-cupones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    MatIconModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './cupones.component.html',
  styleUrl: './cupones.component.css'
})
export class CuponesComponent implements OnInit {
  activeTab: string = 'Listado';

  columnas: string[] = ['index', 'cupon', 'prefijo', 'descripcion', 'categoria', 'fecha'];
  columnasGenerar: string[] = ['index', 'cupon', 'prefijo', 'descripcion'];

  cupones: Cupon[] = [
    {
      cupon: '9910009900021',
      prefijo: '89000022',
      descripcion: 'Cupón Sana Sana Fiscal',
      categoria: '10007892',
      fecha: '2022-05-12'
    },
    {
      cupon: '',
      prefijo: '',
      descripcion: '',
      categoria: '',
      fecha: ''
    }
  ];

  cuponesFiltrados = new MatTableDataSource<Cupon>();
  cuponesGenerados: Cupon[] = [];

  busqueda = '';
  prefijos: string[] = ['10032', '123456', '80001234'];

  // Formulario "Generar"
  codigoCliente = '';
  cliente = '';
  ruc = '';
  descripcionProducto = '';
  cantidadProductos = 1;
  usarSecuenciaManual = false;
  secuenciaInicial = 1;
  prefijoSeleccionado = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.cuponesFiltrados.data = this.cupones;

    this.cuponesFiltrados.filterPredicate = (data, filter: string) => {
      const texto = `${data.cupon} ${data.prefijo} ${data.descripcion} ${data.categoria} ${data.fecha}`.toLowerCase();
      return texto.includes(filter);
    };

    setTimeout(() => {
      this.cuponesFiltrados.paginator = this.paginator;
    });
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  filtrarCupones(): void {
    this.cuponesFiltrados.filter = this.busqueda.trim().toLowerCase();
    if (this.cuponesFiltrados.paginator) {
      this.cuponesFiltrados.paginator.firstPage();
    }
  }

  generarCupones(): void {
    const total = this.cantidadProductos;
    const largoPrefijo = this.prefijoSeleccionado.length;
    const largoSecuencia = 13 - (2 + largoPrefijo); // 2 por "99"
    const inicio = this.usarSecuenciaManual ? this.secuenciaInicial : 1;

    this.cuponesGenerados = [];

    for (let i = 0; i < total; i++) {
      const secuenciaNum = inicio + i;
      const secuenciaStr = secuenciaNum.toString().padStart(largoSecuencia, '0');
      const codigo = `99${this.prefijoSeleccionado}${secuenciaStr}`;

      this.cuponesGenerados.push({
        cupon: codigo,
        prefijo: this.prefijoSeleccionado,
        descripcion: this.descripcionProducto,
        categoria: '',
        fecha: new Date().toISOString().substring(0, 10)
      });
    }
  }

  guardarCupones(): void {
    console.log('✅ Cupones guardados:', this.cuponesGenerados);
  }

  cancelarFormulario(): void {
    this.codigoCliente = '';
    this.cliente = '';
    this.ruc = '';
    this.descripcionProducto = '';
    this.prefijoSeleccionado = '';
    this.usarSecuenciaManual = false;
    this.secuenciaInicial = 1;
    this.cantidadProductos = 1;
    this.cuponesGenerados = [];
  }

  grabar(): void {
    console.log('📦 Datos a grabar (Listado):', this.cupones);
  }

  generar(): void {
    console.log('🛠️ Acción generar (sin uso actual)');
  }
}
