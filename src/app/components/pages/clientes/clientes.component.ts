import { Component, OnInit, ViewChild} from '@angular/core';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { MatSnackBar } from '@angular/material/snack-bar';
import { Cliente } from '../../../interfaces/cliente';
import { DialogClienteComponent } from '../modals/dialog-cliente/dialog-cliente.component';


const ELEMENT_DATA: Cliente[] = [
  { 
    codigo: 101, 
    estado: "Activo", 
    nombre: "Juan Pérez", 
    direccion: "Av. Principal 123, Lima", 
    ruc: "20456123456", 
    fingreso: "2021-05-15"
  },
  { 
    codigo: 102, 
    estado: "Inactivo", 
    nombre: "María González", 
    direccion: "Calle Ficticia 456, Cusco", 
    ruc: "20547896321", 
    fingreso: "2019-08-20"
  },
  { 
    codigo: 103, 
    estado: "Activo", 
    nombre: "Carlos López", 
    direccion: "Av. Central 789, Arequipa", 
    ruc: "20347891234", 
    fingreso: "2020-02-10"
  },
  { 
    codigo: 104, 
    estado: "Activo", 
    nombre: "Ana Rodríguez", 
    direccion: "Calle Los Olivos 1010, Trujillo", 
    ruc: "20458723456", 
    fingreso: "2022-01-01"
  },
  { 
    codigo: 105, 
    estado: "Activo", 
    nombre: "Luis Martínez", 
    direccion: "Calle Sol 500, Piura", 
    ruc: "20567812345", 
    fingreso: "2023-03-10"
  }
];


@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  displayedColumns: string[] = ['codigo', 'estado', 'nombre','direccion','ruc','fingreso','acciones'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    
  ) {

  }

  ngOnInit(): void {
   
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  editarCliente(cliente: Cliente) {
    this.dialog.open(DialogClienteComponent, {
      width: '1200px', // Aumenta el ancho del diálogo
      height:'700px',
      disableClose: true,
      data: cliente
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

}
