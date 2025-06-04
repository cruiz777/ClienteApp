import { Cliente } from './../interfaces/cliente';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClienteSeleccionadoService {
  private clienteSeleccionadoSubject = new BehaviorSubject<Cliente | null>(null);
  clienteSeleccionado$ = this.clienteSeleccionadoSubject.asObservable();

  seleccionar(cliente: Cliente): void {
    this.clienteSeleccionadoSubject.next(cliente);
  }

  obtenerClienteActual(): Cliente | null {
    return this.clienteSeleccionadoSubject.value;
  }
}
