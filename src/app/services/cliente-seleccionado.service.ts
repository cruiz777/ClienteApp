import { Cliente } from './../interfaces/cliente';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClienteSeleccionadoService {
  private clienteSubject = new BehaviorSubject<Cliente | null>(null);
  clienteSeleccionado$ = this.clienteSubject.asObservable();


  seleccionar(cliente: Cliente): void {
    this.clienteSubject.next(cliente);
  }

  obtenerClienteActual(): Cliente | null {
    return this.clienteSubject.value;
  }
}
