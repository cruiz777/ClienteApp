import { Component, OnInit, ViewChild } from '@angular/core';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Router } from '@angular/router';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Cliente } from '../../../interfaces/cliente';
import { DialogClienteComponent } from '../modals/dialog-cliente/dialog-cliente.component';
import { ClienteService } from '../../../services/cliente.service';
import { DialogClienteEditarComponent } from '../modals/dialog-cliente-editar/dialog-cliente-editar.component';
import { LprefijoComponent } from './lprefijo/lprefijo.component';
import { CustomMessageBoxComponent } from '../../utils/messages/custom-message-box.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PermissionsService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  displayedColumns: string[] = ['clientes_codigo', 'nomcli', 'dircli', 'ruc', 'fecing', 'zonaReferencia', 'estadoNombre', 'prefijo', 'codpre', 'acciones'];
  
  clientes: Cliente[] = [];
  selectedCliente: Cliente | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageIndex = 0;
  pageSize = 10;
  totalRegistros = 0;
  filtroForm!: FormGroup;
  clientesFiltrados: Cliente[] = [];
  constructor(
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private clienteService: ClienteService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    public permissions: PermissionsService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.filtroForm = this.fb.group({
    busquedaGeneral: [''],
  prefijoBusqueda: ['']
    });

    this.cargarClientes();
  }

  cargarClientes(pageIndex: number = 0, pageSize: number = 10): void {
  const pageNumber = pageIndex + 1;

  const filtros = {
    busquedaGeneral: this.filtroForm.get('busquedaGeneral')?.value || '',
    prefijoBusqueda: this.filtroForm.get('prefijoBusqueda')?.value || ''
  };

  const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
    disableClose: true,
    data: {
      title: 'Cargando Clientes...',
      message: 'Por favor espere mientras se cargan los clientes.',
      type: 'info',
      isLoading: true,
      loadingText: `Cargando página ${pageNumber}...`,
      showCancel: false
    }
  });

  this.clienteService.getClientes(pageNumber, pageSize, filtros).subscribe({
    next: (resp) => {
      this.clientes = resp.data;
      this.totalRegistros = resp.count;
      this.clientesFiltrados = resp.data; // para mostrar en la tabla directamente
      loadingDialog.close();
    },
    error: (err) => {
      console.error('Error al obtener clientes', err);
      this.mostrarAlerta('No se pudieron cargar los clientes', 'Error');
      loadingDialog.close();
    }
  });
}


  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.cargarClientes(this.pageIndex, this.pageSize);
  }

  editarCliente(cliente: Cliente): void {
    this.dialog.open(DialogClienteEditarComponent, {
      width: '1200px',
      height: '100vh',
      maxHeight: '100vh',
      disableClose: true,
      data: cliente.clientes_codigo
    }).afterClosed().subscribe(result => {
      if (result === 'editado') this.cargarClientes();
    });
  }

  nuevoCliente(): void {
    this.dialog.open(DialogClienteComponent, {
      width: '1200px',
      height: '100vh',
      maxHeight: '100vh',
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (result === 'editado') this.cargarClientes();
    });
  }

  editarPrefijosCliente(cliente: Cliente): void {
    this.dialog.open(LprefijoComponent, {
      width: '670px',
      height: '50vh',
      maxHeight: '50vh',
      disableClose: true,
      data: cliente.clientes_codigo
    }).afterClosed().subscribe(result => {
      if (result === 'editado') this.cargarClientes();
    });
  }

  seleccionarFila(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.clienteSeleccionadoService.seleccionar(cliente);
    this.router.navigate(['/productos/cliente-seleccion']);
  }

  mostrarAlerta(mensaje: string, tipo: string): void {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarClientes(this.pageIndex, this.pageSize);
  }
  limpiarFiltros(): void {
  this.filtroForm.reset();           // Borra todos los campos
  this.pageIndex = 0;                // Reinicia a la primera página
  this.cargarClientes(0);            // Vuelve a cargar sin filtros
}

}
