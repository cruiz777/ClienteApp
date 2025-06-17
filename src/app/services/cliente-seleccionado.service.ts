import { Cliente } from './../interfaces/cliente';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'clienteSeleccionado';

@Injectable({
  providedIn: 'root'
})
export class ClienteSeleccionadoService {
  private clienteSubject = new BehaviorSubject<Cliente | null>(null);
  clienteSeleccionado$ = this.clienteSubject.asObservable();

  constructor() {
    const clienteGuardado = localStorage.getItem(STORAGE_KEY);
    if (clienteGuardado) {
      this.clienteSubject.next(JSON.parse(clienteGuardado));
    }
  }

  seleccionar(cliente: Cliente): void {
    this.clienteSubject.next(cliente);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cliente));
  }

  obtenerClienteActual(): Cliente | null {
    return this.clienteSubject.value;
  }
  limpiar(): void {
    this.clienteSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
