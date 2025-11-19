import { Component } from '@angular/core';
import { ColDef } from 'ag-grid-community';

interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  prefijo: string;
}

interface EstadoCuentaRow {
  factura: string;
  documento: string;
  fecha: string;
  valor: number;
  pago: number;
  debe: number;
  haber: number;
  saldo: number;
  observacion: string;
}

@Component({
  selector: 'app-estadocuentacliente',
  templateUrl: './estadocuentacliente.component.html',
  styleUrls: ['./estadocuentacliente.component.css']
})
export class EstadocuentaclienteComponent {

  hoy: Date = new Date();

  // filtros de fecha (puedes cambiarlos a Date si usas datepicker)
  fechaDesde: string = '';
  fechaHasta: string = '';

  clienteSeleccionado: number = 1;

  clientes: Cliente[] = [
    {
      id: 1,
      nombre: 'EMIHANA CIA. LTDA.',
      direccion: 'VIA A CAYAMBE PANAMERICANA NORTE 3 1/2 SECTOR ISHIGTO',
      telefono: '593-02-2363495',
      prefijo: '12212'
    }
  ];

  // formateador de moneda para AG Grid
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') {
      return '';
    }
    const valor = Number(params.value);
    return valor.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  columnDefs: ColDef[] = [
    { headerName: 'Factura', field: 'factura', width: 150 },
    { headerName: 'Documento', field: 'documento', width: 110 },
    { headerName: 'Fecha', field: 'fecha', width: 110 },
    {
      headerName: 'Valor',
      field: 'valor',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Pago',
      field: 'pago',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Debe',
      field: 'debe',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Haber',
      field: 'haber',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Observación',
      field: 'observacion',
      flex: 1,
      minWidth: 220
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'celda-centro'
  };

  // datos de ejemplo basados en el PDF (puedes luego cargarlos desde tu servicio)
  rowData: EstadoCuentaRow[] = [
    {
      factura: '001001000046245',
      documento: '',
      fecha: '18/05/2017',
      valor: 1710.00,
      pago: 0,
      debe: 1710.00,
      haber: 0,
      saldo: 1710.00,
      observacion: 'F / MANTENIMIENTO ANUAL PREFIJO: 212441 MAYO 2017-DICIEMBRE 2017'
    },
    {
      factura: '001001000046245',
      documento: '3250',
      fecha: '29/05/2017',
      valor: 0,
      pago: 1470.00,
      debe: 0,
      haber: 1470.00,
      saldo: 240.00,
      observacion: 'P / CHEQUE BANCO PICHINCHA No.CHEQUE 31397 - RETENCIÓN IVA'
    },
    {
      factura: '001010000003911',
      documento: '',
      fecha: '14/10/2022',
      valor: 5115.04,
      pago: 0,
      debe: 5115.04,
      haber: 0,
      saldo: 5355.04,
      observacion: 'F / MANTENIMIENTO ANUAL Prefijo: 12212 Octubre 2022–Setiembre 2023'
    },
    {
      factura: '001010000003911',
      documento: '21699',
      fecha: '17/10/2022',
      valor: 0,
      pago: 4567.00,
      debe: 0,
      haber: 4567.00,
      saldo: 788.04,
      observacion: 'P / TRANSFERENCIA PICHINCHA - RETENCIÓN IVA'
    },
    {
      factura: '001010000006599',
      documento: '',
      fecha: '10/03/2025',
      valor: 1288.00,
      pago: 0,
      debe: 1288.00,
      haber: 0,
      saldo: 2076.04,
      observacion: 'F / MANTENIMIENTO ANUAL PREFIJO: 12212 ENERO 2025 HASTA DICIEMBRE 2025'
    },
    {
      factura: '001010000006599',
      documento: '29534',
      fecha: '13/03/2025',
      valor: 0,
      pago: 1120.00,
      debe: 0,
      haber: 1120.00,
      saldo: 956.04,
      observacion: 'P / TRANSFERENCIA PICHINCHA - RETENCIÓN IVA'
    }
  ];

  get clienteActual(): Cliente | undefined {
    return this.clientes.find(c => c.id === this.clienteSeleccionado);
  }

  // totales similares a "TOTAL POR CLIENTE" / "TOTAL GENERAL"
  get totalValor(): number {
    return this.rowData.reduce((acc, r) => acc + (r.valor || 0), 0);
  }

  get totalPago(): number {
    return this.rowData.reduce((acc, r) => acc + (r.pago || 0), 0);
  }

  get totalDebe(): number {
    return this.rowData.reduce((acc, r) => acc + (r.debe || 0), 0);
  }

  get totalHaber(): number {
    return this.rowData.reduce((acc, r) => acc + (r.haber || 0), 0);
  }

  get totalSaldo(): number {
    // en el PDF el saldo final es el saldo acumulado, aquí sumamos todos
    return this.rowData.reduce((acc, r) => acc + (r.saldo || 0), 0);
  }

  nuevaConsulta(): void {
    // aquí pones tu lógica para limpiar filtros / volver a consultar
    console.log('Nueva consulta');
  }

  imprimir(): void {
    // lógica para mandar a imprimir o generar PDF desde este estado
    console.log('Imprimir estado de cuenta');
  }

  cancelar(): void {
    // lógica para cerrar diálogo o navegar atrás
    console.log('Cancelar');
  }
}
