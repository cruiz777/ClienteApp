import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellClickedEvent,
} from 'ag-grid-community';

@Component({
  selector: 'app-cierre-anticipos',
  templateUrl: './cierre-anticipos.component.html',
  styleUrls: ['./cierre-anticipos.component.css'],
})
export class CierreAnticiposComponent implements OnInit {
  selectedTab: 'cierre' | 'liquidados' = 'cierre';

  filtroCierreForm!: FormGroup;
  filtroLiquidadosForm!: FormGroup;

  columnDefsCierre: ColDef[] = [];
  columnDefsLiquidados: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 110,
  };

  rowDataCierre: any[] = [];
  rowDataLiquidados: any[] = [];

  private gridApiCierre!: GridApi;
  private gridApiLiquidados!: GridApi;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForms();
    this.buildColumns();
    this.loadMockData();
  }

  private buildForms(): void {
    this.filtroCierreForm = this.fb.group({
      fechaInicio: [''],
      fechaHasta: [''],
      tipoAnticipo: [''],
      cliente: [''],
    });

    this.filtroLiquidadosForm = this.fb.group({
      fechaInicio: [''],
      fechaHasta: [''],
      cliente: [''],
    });
  }

  private buildColumns(): void {
    this.columnDefsCierre = [
      { headerName: 'Anticipo', field: 'anticipo' },
      { headerName: 'Fecha', field: 'fecha' },
      { headerName: 'Cliente', field: 'cliente' },
      { headerName: 'Monto', field: 'monto', type: 'rightAligned' },
      { headerName: 'Saldo', field: 'saldo', type: 'rightAligned' },
      { headerName: 'Concepto', field: 'concepto' },
      { headerName: 'C. Forma', field: 'codigoFormaPago' },
      { headerName: 'Des. Forma Pago', field: 'descripcionFormaPago' },
      { headerName: 'Tipo. Ant', field: 'tipoAnticipo' },
      {
        headerName: 'Cierre',
        colId: 'cierreAction',
        width: 90,
        cellRenderer: () => `<span class="icon-btn lock"></span>`,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Desglose',
        colId: 'desgloseAction',
        width: 90,
        cellRenderer: () => `<span class="icon-btn details"></span>`,
        sortable: false,
        filter: false,
      },
    ];

    this.columnDefsLiquidados = [
      { headerName: '# Liq', field: 'numeroLiq' },
      { headerName: 'Fecha Liq', field: 'fechaLiq' },
      { headerName: 'Anticipo', field: 'anticipo' },
      { headerName: 'Cliente', field: 'cliente' },
      { headerName: 'Valor', field: 'valor', type: 'rightAligned' },
      { headerName: 'OBS', field: 'observacion' },
      { headerName: 'Beneficiario', field: 'beneficiario' },
      { headerName: 'Asiento C.', field: 'asientoContable' },
      { headerName: 'Usuario', field: 'usuario' },
      { headerName: 'Tipo ANT.', field: 'tipoAnticipo' },
      {
        headerName: 'Liquidación',
        colId: 'liqAction',
        width: 110,
        cellRenderer: () => `<span class="icon-btn lock"></span>`,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Desglose',
        colId: 'desgloseAction',
        width: 90,
        cellRenderer: () => `<span class="icon-btn details"></span>`,
        sortable: false,
        filter: false,
      },
    ];
  }

  private loadMockData(): void {
    this.rowDataCierre = [
      {
        anticipo: 1,
        fecha: '2025-11-01',
        cliente: 'Clínica Demo',
        monto: 1000,
        saldo: 400,
        concepto: 'Anticipo cirugía',
        codigoFormaPago: 'TRF',
        descripcionFormaPago: 'Transferencia',
        tipoAnticipo: 'Cirugía',
      },
      {
        anticipo: 2,
        fecha: '2025-11-02',
        cliente: 'Hospital Central',
        monto: 500,
        saldo: 0,
        concepto: 'Anticipo consulta',
        codigoFormaPago: 'EFE',
        descripcionFormaPago: 'Efectivo',
        tipoAnticipo: 'Consulta',
      },
    ];

    this.rowDataLiquidados = [
      {
        numeroLiq: 1,
        fechaLiq: '2025-11-05',
        anticipo: 1,
        cliente: 'Clínica Demo',
        valor: 600,
        observacion: 'Liquidación total',
        beneficiario: 'Paciente Demo',
        asientoContable: 'AS-0001',
        usuario: 'ADMIN',
        tipoAnticipo: 'Cirugía',
      },
      {
        numeroLiq: 2,
        fechaLiq: '2025-11-06',
        anticipo: 2,
        cliente: 'Hospital Central',
        valor: 500,
        observacion: 'Liquidación parcial',
        beneficiario: 'Paciente 2',
        asientoContable: 'AS-0002',
        usuario: 'CAJA01',
        tipoAnticipo: 'Consulta',
      },
    ];
  }

  onGridReadyCierre(event: GridReadyEvent): void {
    this.gridApiCierre = event.api;
    this.gridApiCierre.sizeColumnsToFit();
  }

  onGridReadyLiquidados(event: GridReadyEvent): void {
    this.gridApiLiquidados = event.api;
    this.gridApiLiquidados.sizeColumnsToFit();
  }

  onCellClickedCierre(event: CellClickedEvent): void {
    if (event.colDef.colId === 'cierreAction') {
      this.cerrarAnticipo(event.data);
    } else if (event.colDef.colId === 'desgloseAction') {
      this.verDesglose(event.data);
    }
  }

  onCellClickedLiquidados(event: CellClickedEvent): void {
    if (event.colDef.colId === 'liqAction') {
      this.verLiquidacion(event.data);
    } else if (event.colDef.colId === 'desgloseAction') {
      this.verDesglose(event.data);
    }
  }

  onNuevoCierre(): void {
    console.log('Nuevo anticipo');
  }

  onBuscarCierre(): void {
    console.log('Buscar cierre', this.filtroCierreForm.value);
  }

  onNuevoLiq(): void {
    console.log('Nueva liquidación');
  }

  onBuscarLiq(): void {
    console.log('Buscar liquidados', this.filtroLiquidadosForm.value);
  }

  private cerrarAnticipo(row: any): void {
    console.log('Cerrar anticipo', row);
  }

  private verDesglose(row: any): void {
    console.log('Ver desglose', row);
  }

  private verLiquidacion(row: any): void {
    console.log('Ver liquidación', row);
  }
}
