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
  private ultimoClienteResumenMostrado: number | null = null;

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
     this.ultimoClienteResumenMostrado = null;//resetea tambien la bandera para mostrar el ultimo gtin
  }
    //Metodo para mostrar el mensaje de ultimo gtin
  debeMostrarResumenGtin(codigoCliente: number): boolean {
    if (this.ultimoClienteResumenMostrado === codigoCliente) {
      return false;
    }
    this.ultimoClienteResumenMostrado = codigoCliente;
    return true;
  }
  resetResumenGtin(): void {
    this.ultimoClienteResumenMostrado = null;
  }
}
