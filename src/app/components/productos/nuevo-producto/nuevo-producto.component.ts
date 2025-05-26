import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';

@Component({
  selector: 'app-nuevo-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.css'
})
export class NuevoProductoComponent implements OnInit {
  clienteSeleccionado: Cliente | null = null;

  constructor(private clienteSeleccionadoService: ClienteSeleccionadoService) {}

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      console.log('Cliente cargado en NuevoProductoComponent:', cliente);
    });
  }
}
