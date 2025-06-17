import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

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

  cupones: any[] = [
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

  cuponesFiltrados = new MatTableDataSource<any>();
  busqueda = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.cuponesFiltrados.data = this.cupones;

    this.cuponesFiltrados.filterPredicate = (data, filter: string) => {
      const texto = `${data.cupon} ${data.prefijo} ${data.descripcion} ${data.categoria} ${data.fecha}`.toLowerCase();
      return texto.includes(filter);
    };
  }

  ngAfterViewInit(): void {
    this.cuponesFiltrados.paginator = this.paginator;
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
}
