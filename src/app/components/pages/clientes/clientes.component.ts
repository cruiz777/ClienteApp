import { Component, OnInit, ViewChild} from '@angular/core';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Router } from '@angular/router';
import { NavigationComponentProducto } from '../../productos/navigation/navigation.component'
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { MatSnackBar } from '@angular/material/snack-bar';
import { Cliente } from '../../../interfaces/cliente';
import { DialogClienteComponent } from '../modals/dialog-cliente/dialog-cliente.component';
import { ClienteService } from '../../../services/cliente.service';
import { DialogClienteEditarComponent } from '../modals/dialog-cliente-editar/dialog-cliente-editar.component';

const ELEMENT_DATA: Cliente[] = [
  {
    clientes_codigo: 101,
    nomcli: "Juan Pérez",
    dircli: "Av. Principal 123, Lima",
    ruc: "20456123456",
    fecing: "2021-05-15",
    zonaReferencia:"Z01",
    estadoNombre:"Afiliada",
    prefijo:'7777'
  }
];


@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  displayedColumns: string[] = ['clientes_codigo',  'nomcli','dircli','ruc','fecing','zonaReferencia','estadoNombre','prefijo','acciones'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);
  selectedCliente: Cliente | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private clienteService:ClienteService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router
  ) {
    }

  ngOnInit(): void {
    this.cargarClientes();

  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  cargarClientes(): void {

    // Limpia primero la tabla visualmente
    this.dataSource = new MatTableDataSource<Cliente>([]);
this.dataSource.paginator = this.paginator;

    this.clienteService.getClientes().subscribe({
      next: (resp) => {
        this.dataSource = new MatTableDataSource(resp);
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => {
        console.error('Error al obtener clientes', err);
        this.mostrarAlerta('No se pudieron cargar los clientes', 'Error');
      }
    });
  }



  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  editarCliente(cliente:Cliente) {
    this.dialog.open(DialogClienteEditarComponent, {
      width: '1200px', // Aumenta el ancho del diálogo

      height: '100vh', // ✅ que use casi toda la pantalla
      maxHeight: '100vh',
      disableClose: true,
      data: cliente.clientes_codigo
    }).afterClosed().subscribe(result => {
      if (result === "editado")
        this.cargarClientes(); // ✅ recarga la tabla
       // this.mostrarAlerta('Cliente actualizado correctamente', 'Éxito');
    });
  }

  nuevoCliente() {
    this.dialog.open(DialogClienteComponent, {
      width: '1200px', // Aumenta el ancho del diálogo

      height: '100vh', // ✅ que use casi toda la pantalla
      maxHeight: '100vh',
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === "editado")
        result = "editado";
    });
  }



  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }
  seleccionarFila(cliente: Cliente) {
  this.selectedCliente = cliente;
  this.clienteSeleccionadoService.seleccionar(cliente);
  this.router.navigate(['/menuProductos']);
}

}
