import { Component, OnInit, ViewChild} from '@angular/core';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { MatSnackBar } from '@angular/material/snack-bar';
import { Cliente } from '../../../interfaces/cliente';
import { DialogClienteComponent } from '../modals/dialog-cliente/dialog-cliente.component';
import { ClienteService } from '../../../services/cliente.service';

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
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private clienteService:ClienteService   
  ) {

  }

  ngOnInit(): void {
    this.cargarClientes();
    
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  cargarClientes(): void {
    this.clienteService.getClientes().subscribe({
      next: (resp) => {
        debugger
        this.dataSource = new MatTableDataSource(resp);
        this.dataSource.paginator = this.paginator;
        console.log('Clientes:', this.dataSource);
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

  editarCliente(cliente: Cliente) {
    this.dialog.open(DialogClienteComponent, {
      width: '1200px', // Aumenta el ancho del diálogo
     
      height: '100vh', // ✅ que use casi toda la pantalla
      maxHeight: '100vh',
      disableClose: true,
      data: cliente
    }).afterClosed().subscribe(result => {
      if (result === "editado")
        result = "editado";
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
    console.log('Fila seleccionada:', cliente.clientes_codigo);
  
    // Ejemplo acción: abrir el modal de editar
    alert("hola"+cliente.clientes_codigo);
  }
  

}
