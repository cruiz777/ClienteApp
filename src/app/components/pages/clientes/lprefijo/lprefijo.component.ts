import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PrefijoService, PrefijoClienteResponse } from 'src/app/services/prefijo.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-lprefijo',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './lprefijo.component.html',
  styleUrls: ['./lprefijo.component.css']
})
export class LprefijoComponent implements OnInit {
  dataSourcePrefijo = new MatTableDataSource<PrefijoClienteResponse>([]);
  
  displayedPrefijoColumns: string[] = [
    'clientesCodigo',
    'codpre',
    'gln',
    'fecha',
    'estado',
    'fechaCierre',
    'tipoLocalizacion',
     'orden'
  ];

  @ViewChild('paginatorPrefijo', { static: false }) paginatorPrefijo!: MatPaginator;
  @ViewChild(MatSort) sortPrefijo!: MatSort;

  constructor(
    private prefijoService: PrefijoService,
    @Inject(MAT_DIALOG_DATA) public clientesCodigo: number,
    private router: Router,
    private dialogRef: MatDialogRef<LprefijoComponent>,
  ) {}

  ngOnInit(): void {
    this.cargarPrefijoCliente(this.clientesCodigo);
  }

  cargarPrefijoCliente(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        const datos = Array.isArray(data) ? data : [];
        this.dataSourcePrefijo = new MatTableDataSource(datos);

        this.dataSourcePrefijo.filterPredicate = (item: PrefijoClienteResponse, filter: string) => {
          const dataStr = `${item.nomcli} ${item.ruccli} ${item.gln} ${item.codpre}`.toLowerCase();
          return dataStr.includes(filter.trim().toLowerCase());
        };

        setTimeout(() => {
          if (this.paginatorPrefijo && this.sortPrefijo) {
            this.dataSourcePrefijo.paginator = this.paginatorPrefijo;
            this.dataSourcePrefijo.sort = this.sortPrefijo;
          }
        }, 0);
      },
      error: (err) => {
        console.error('❌ Error al obtener prefijo del cliente:', err);
      }
    });
  }
cancelar(): void {
    this.dialogRef.close("editado");
    this.router.navigate(['/codbar/ficha-de-cliente/clientes']); // Redirecciona a /pages/clientes
  }
}
