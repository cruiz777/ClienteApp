import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { UsuarioService } from 'src/app/services/usuario.service';
@Component({
  selector: 'app-navigation-producto',
  templateUrl: './navigation-producto.component.html',
  styleUrls: ['./navigation-producto.component.css']
})
export class NavigationProductoComponent implements OnInit {
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  clienteSeleccionado: Cliente | null = null;

  columnas: string[] = [
    'clientes_codigo', 'nomcli', 'dircli', 'ruc', 'fecing',
    'zonaReferencia', 'estadoNombre'
  ];
usuarioActual : any;
  constructor(
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private usuarioService:UsuarioService
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
  }

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
    });
  }


  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']).then(() => window.location.reload());
  }
}
