import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // 👈 importa RouterModule
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, RouterModule], // 👈 agrégalo aquí
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  clienteSeleccionado: Cliente | null = null;

  constructor(private clienteSeleccionadoService: ClienteSeleccionadoService) {}

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
    });
    }
  }
