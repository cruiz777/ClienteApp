import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Si usas AG Grid:
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-nota-debito',
  templateUrl: './nota-debito.component.html',
  styleUrls: ['./nota-debito.component.css']
})
export class NotaDebitoComponent implements OnInit {

  // Encabezado
  sucursal = '001';
  caja = '010';
  numero = '';
  fecha = new Date().toISOString().substring(0,10);
  cliente = '';
  direccion = '';
  ruc = '';
  factura = '';
  observacion = '';

  // Grid Detalle
  detalleColumnDefs: ColDef[] = [
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 70, pinned: 'left' },
    { headerName: 'Código', field: 'codigo', editable: true, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: true, flex: 1, minWidth: 220 },
    { headerName: 'Cantidad', field: 'cantidad', editable: true, width: 120, type: 'rightAligned' },
    { headerName: 'P.V.P.', field: 'pvp', editable: true, width: 120, type: 'rightAligned' },
    { headerName: 'Total', valueGetter: p => (Number(p.data?.cantidad || 0) * Number(p.data?.pvp || 0)).toFixed(2),
      width: 120, type: 'rightAligned' },
    { headerName: '', field: 'aplicaIva', headerCheckboxSelection: false, width: 60,
      cellRenderer: () => `<input type="checkbox" class="nc-checkbox">` },
    { headerName: 'Valor Dev.', field: 'valorDevolucion', editable: true, width: 130, type: 'rightAligned' }
  ];
  detalleRowData: any[] = [{}];

  // Grid Formas de Pago
  pagoColumnDefs: ColDef[] = [
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 70, pinned: 'left' },
    { headerName: 'Código', field: 'codigo', editable: true, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: true, flex: 1, minWidth: 200 },
    { headerName: 'Debe', field: 'debe', editable: true, width: 120, type: 'rightAligned' },
    { headerName: 'Haber', field: 'haber', editable: true, width: 120, type: 'rightAligned' },
    { headerName: 'Saldo', valueGetter: p => (Number(p.data?.debe || 0) - Number(p.data?.haber || 0)).toFixed(2),
      width: 120, type: 'rightAligned' },
    { headerName: 'Pago', field: 'pago', editable: true, width: 120, type: 'rightAligned' },
    { headerName: 'Cuenta Cont.', field: 'cuenta', editable: true, width: 140 }
  ];
  pagoRowData: any[] = [{}];

  ngOnInit(): void {}

  // Totales
  get subTotal(): number {
    return this.detalleRowData
      .map(r => Number(r.cantidad || 0) * Number(r.pvp || 0))
      .reduce((a, b) => a + b, 0);
  }
  get base0(): number { return 0; }
  get baseIva(): number { return this.subTotal; }
  get iva(): number { return +(this.baseIva * 0.15).toFixed(2); } // ajusta si usas otro %
  get totalDev(): number {
    const devol = this.detalleRowData.map(r => Number(r.valorDevolucion || 0))
      .reduce((a, b) => a + b, 0);
    return +(this.subTotal + this.iva - devol).toFixed(2);
  }

  nuevo(): void {
    this.detalleRowData = [{}];
    this.pagoRowData = [{}];
    this.numero = '';
    this.observacion = '';
  }

  grabar(): void {
    // arma payload según tu backend
    const payload = {
      sucursal: this.sucursal,
      caja: this.caja,
      numero: this.numero,
      fecha: this.fecha,
      cliente: this.cliente,
      direccion: this.direccion,
      ruc: this.ruc,
      factura: this.factura,
      observacion: this.observacion,
      detalle: this.detalleRowData,
      formasPago: this.pagoRowData,
      totales: {
        subTotal: this.subTotal,
        base0: this.base0,
        baseIva: this.baseIva,
        iva: this.iva,
        totalDev: this.totalDev
      }
    };
    console.log('Guardar ND ->', payload);
    // TODO: llamar servicio HTTP
  }

  exportar(tipo: 'pdf' | 'excel' = 'pdf'): void {
    console.log('Exportar', tipo);
    // TODO: tu lógica de exportación
  }
}
