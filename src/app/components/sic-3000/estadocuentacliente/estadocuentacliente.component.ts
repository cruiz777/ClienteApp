import { Component } from '@angular/core';

@Component({
  selector: 'app-estadocuentacliente',
  templateUrl: './estadocuentacliente.component.html',
  styleUrl: './estadocuentacliente.component.css'
})
export class EstadocuentaclienteComponent {
   clienteSeleccionado: number = 5;

  clientes = [
    { id: 5, nombre: 'James Brown Pharma C.A.' },
    // otros clientes si deseas
  ];

  estadoCuenta = [
    { factura: '0010000100', fecha: '03/01/2023', debe: 3145.21, haber: 0.00, saldo: 3145.21, observacion: 'Factura' },
    { factura: '0010000121', fecha: '01/02/2023', debe: 1354.98, haber: 0.00, saldo: 4500.19, observacion: 'Factura' },
    { factura: '0010000120', fecha: '01/02/2023', debe: 3208.68, haber: 0.00, saldo: 7708.88, observacion: 'Factura' },
    { factura: '0010000115', fecha: '25/01/2023', debe: 2847.04, haber: 0.00, saldo: 10555.92, observacion: 'Factura' }
  ];

  columnas: string[] = ['factura', 'fecha', 'debe', 'haber', 'saldo', 'observacion'];

  getNombreCliente(): string {
    const cliente = this.clientes.find(c => c.id === this.clienteSeleccionado);
    return cliente ? cliente.nombre : '';
  }

  nuevaConsulta() {
    console.log('Nueva consulta');
  }

  imprimir() {
    console.log('Imprimir estado de cuenta');
  }

  cancelar() {
    console.log('Cancelar acción');
  }
}
