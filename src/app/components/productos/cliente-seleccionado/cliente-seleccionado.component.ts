import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { DialogClienteEditarComponent } from '../../pages/modals/dialog-cliente-editar/dialog-cliente-editar.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { LprefijoComponent } from '../../pages/clientes/lprefijo/lprefijo.component';
import { PermissionsService } from 'src/app/services/permission.service';
@Component({
  selector: 'app-cliente-seleccionado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './cliente-seleccionado.component.html',
  styleUrl: './cliente-seleccionado.component.css'

})
export class ClienteSeleccionadoComponent {
  clienteSeleccionado: Cliente | null = null;
  currentDateTime: string = '';

  columnas: string[] = [
    'clientes_codigo', 'nomcli', 'dircli', 'ruc', 'fecing',
    'zonaReferencia', 'estadoNombre','codpre','acciones'
  ];

  constructor(
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private dialog: MatDialog,
    public permissions: PermissionsService
  ) { }

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
    });
  }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  salir(): void {
    this.router.navigate(['/pages/clientes']).then(() => window.location.reload());
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
          this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
    });
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
        if (result === 'editado') {
          //this.cargarClientes();
        }
      });
    }
    

}
