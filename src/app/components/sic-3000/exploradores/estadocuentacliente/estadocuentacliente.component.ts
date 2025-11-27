import { Component, OnInit, ViewChild } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import jsPDF from 'jspdf';

interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  prefijo: string;
}

interface EstadoCuentaRow {
  fecha: string;
  tipodoc: string;
  numdoc: string;
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
export class EstadocuentaclienteComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  // AG-Grid API
  private gridApi!: GridApi;

  // Filtro de búsqueda
  filtroCliente: string = '';

  // Cliente seleccionado
  clienteSeleccionadoId: number | null = null;
  nombreClienteActual: string = '';

  // Control del menú de exportación
  showExportMenu = false;

  // Lista completa de clientes (ejemplo; luego los cargas desde servicio)
  clientes: Cliente[] = [
    { id: 1, nombre: 'James Brown Pharma C.A.', ruc: '1790012345001', prefijo: '7890001' },
    { id: 2, nombre: 'Farmacias del Sur S.A.',   ruc: '0999999999001', prefijo: '7890002' },
    { id: 3, nombre: 'Distribuidora Quito Cía.', ruc: '1798765432001', prefijo: '7890003' }
  ];

  // Lista filtrada según el texto de búsqueda
  clientesFiltrados: Cliente[] = [];

  // Datos de la grilla
  rowData: EstadoCuentaRow[] = [];

  // Definición de columnas AG Grid
  columnDefs: ColDef[] = [
    {
      field: 'fecha',
      headerName: 'Fecha',
      minWidth: 110,
      sortable: true,
      filter: true
    },
    {
      field: 'tipodoc',
      headerName: 'Tipo Doc',
      minWidth: 110,
      sortable: true,
      filter: true
    },
    {
      field: 'numdoc',
      headerName: 'Número Doc',
      minWidth: 130,
      sortable: true,
      filter: true
    },
    {
      field: 'debe',
      headerName: 'Debe',
      type: 'numericColumn',
      minWidth: 120,
      valueFormatter: params =>
        params.value != null ? Number(params.value).toFixed(2) : '',
      cellClass: 'ag-cell-right'
    },
    {
      field: 'haber',
      headerName: 'Haber',
      type: 'numericColumn',
      minWidth: 120,
      valueFormatter: params =>
        params.value != null ? Number(params.value).toFixed(2) : '',
      cellClass: 'ag-cell-right'
    },
    {
      field: 'saldo',
      headerName: 'Saldo',
      type: 'numericColumn',
      minWidth: 120,
      valueFormatter: params =>
        params.value != null ? Number(params.value).toFixed(2) : '',
      cellClass: 'ag-cell-right'
    },
    {
      field: 'observacion',
      headerName: 'Observación',
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true
    }
  ];

  // Configuración por defecto
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };

  ngOnInit(): void {
    // Inicialmente, lista filtrada = lista completa
    this.clientesFiltrados = [...this.clientes];
  }

  // Evento gridReady
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  // Filtro por nombre / ruc / prefijo
  onFiltroClienteChange(): void {
    const term = this.filtroCliente.trim().toLowerCase();

    if (!term) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }

    this.clientesFiltrados = this.clientes.filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.ruc.toLowerCase().includes(term) ||
      c.prefijo.toLowerCase().includes(term)
    );
  }

  // Cambio de cliente en el combo
  onClienteChange(): void {
    this.actualizarNombreCliente();
    this.cargarEstadoCuentaCliente();
  }

  // Actualiza label del cliente seleccionado
  private actualizarNombreCliente(): void {
    const cli = this.clientes.find(c => c.id === this.clienteSeleccionadoId);
    this.nombreClienteActual = cli ? `${cli.nombre} (RUC: ${cli.ruc})` : '';
  }

  // Carga datos de estado de cuenta (dummy; luego llamas a tu servicio)
  private cargarEstadoCuentaCliente(): void {
    if (!this.clienteSeleccionadoId) {
      this.rowData = [];
      return;
    }

    // EJEMPLO: datos estáticos; reemplaza con llamada HTTP según clienteSeleccionadoId
    this.rowData = [
      {
        fecha: '2025-01-03',
        tipodoc: 'FAC',
        numdoc: '001-001-0000100',
        debe: 3145.21,
        haber: 0,
        saldo: 3145.21,
        observacion: 'Factura crédito'
      },
      {
        fecha: '2025-02-01',
        tipodoc: 'FAC',
        numdoc: '001-001-0000121',
        debe: 1354.98,
        haber: 0,
        saldo: 4500.19,
        observacion: 'Factura crédito'
      },
      {
        fecha: '2025-02-10',
        tipodoc: 'NC',
        numdoc: '001-001-0000005',
        debe: 0,
        haber: 500.0,
        saldo: 4000.19,
        observacion: 'Nota de crédito'
      }
    ];
  }

  // Limpia todo: filtros, selección y grilla
  nuevaConsulta(): void {
    this.filtroCliente = '';
    this.clientesFiltrados = [...this.clientes];
    this.clienteSeleccionadoId = null;
    this.nombreClienteActual = '';
    this.rowData = [];
  }

  // Mostrar/ocultar menú de exportación
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  // Exportar a Excel (CSV que abre Excel)
  exportarExcel(): void {
    this.showExportMenu = false;

    if (!this.gridApi || !this.rowData || this.rowData.length === 0) {
      return;
    }

    this.gridApi.exportDataAsCsv({
      fileName: `estado_cuenta_${this.nombreClienteActual || 'cliente'}.csv`,
      columnSeparator: ';'
    });
  }

  // Exportar a PDF (básico con jsPDF)
  exportarPdf(): void {
    this.showExportMenu = false;

    if (!this.rowData || this.rowData.length === 0) {
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const marginLeft = 10;
    let currentY = 15;

    doc.setFontSize(14);
    doc.text('Estado de Cuenta de Cliente', marginLeft, currentY);
    currentY += 8;

    if (this.nombreClienteActual) {
      doc.setFontSize(11);
      doc.text(this.nombreClienteActual, marginLeft, currentY);
      currentY += 6;
    }

    doc.setFontSize(10);
    currentY += 4;

    // Encabezados
    doc.text('Fecha',   marginLeft,      currentY);
    doc.text('T.Doc',   marginLeft + 25, currentY);
    doc.text('Num.Doc', marginLeft + 45, currentY);
    doc.text('Debe',    marginLeft + 90, currentY);
    doc.text('Haber',   marginLeft + 115, currentY);
    doc.text('Saldo',   marginLeft + 140, currentY);
    currentY += 5;
    doc.line(marginLeft, currentY, 200, currentY);
    currentY += 5;

    // Filas
    this.rowData.forEach(row => {
      if (currentY > 280) {
        doc.addPage();
        currentY = 15;
      }

      doc.text(row.fecha,            marginLeft,      currentY);
      doc.text(row.tipodoc,          marginLeft + 25, currentY);
      doc.text(row.numdoc,           marginLeft + 45, currentY);
      doc.text(row.debe.toFixed(2),  marginLeft + 90, currentY,  { align: 'right' });
      doc.text(row.haber.toFixed(2), marginLeft + 115, currentY, { align: 'right' });
      doc.text(row.saldo.toFixed(2), marginLeft + 140, currentY, { align: 'right' });

      currentY += 5;

      if (row.observacion) {
        const obsLines: string[] = doc.splitTextToSize(
          `Obs: ${row.observacion}`,
          180
        ) as string[];

        obsLines.forEach((line: string) => {
          if (currentY > 280) {
            doc.addPage();
            currentY = 15;
          }
          doc.text(line, marginLeft + 5, currentY);
          currentY += 4;
        });
      }

      currentY += 2;
    });

    doc.save(`estado_cuenta_${this.nombreClienteActual || 'cliente'}.pdf`);
  }
}
