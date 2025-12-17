import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';

type TipoDocumento = 'FACTURAS';

export interface FacturaElectronicaRow {
  seleccionado?: boolean;
  noFactura: string;
  fecha: string; // ISO o dd/MM/yyyy
  ruc: string;
  cliente: string;
  subtotalSinIva: number;
  subtotalConIva: number;
  iva: number;
  total: number;
}

@Component({
  selector: 'app-reenvio-fac',
  templateUrl: './reenvio-fac.component.html',
  styleUrls: ['./reenvio-fac.component.css']
})
export class ReenvioFacComponent implements OnInit {
  filtrosForm!: FormGroup;

  loading = false;
  private gridApi?: GridApi<FacturaElectronicaRow>;

  rowData: FacturaElectronicaRow[] = [];

  overlayLoadingTemplate = `
    <span style="padding: 8px 12px; border: 1px solid #d3dde8; background: #ffffff; border-radius: 6px;">
      Cargando...
    </span>
  `;
  overlayNoRowsTemplate = `
    <span style="padding: 8px 12px; border: 1px solid #d3dde8; background: #ffffff; border-radius: 6px;">
      No hay registros para mostrar.
    </span>
  `;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    minWidth: 90,
  };

  columnDefs: ColDef<FacturaElectronicaRow>[] = [
    {
      headerName: '',
      width: 46,
      pinned: 'left',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      filter: false,
      sortable: false,
      resizable: false,
    },
    { headerName: 'No. Factura', field: 'noFactura', minWidth: 160 },
    { headerName: 'Fecha', field: 'fecha', minWidth: 120 },
    { headerName: 'Ruc', field: 'ruc', minWidth: 150 },
    { headerName: 'Cliente', field: 'cliente', minWidth: 320, flex: 1 },
    {
      headerName: 'SUBTOT S/IVA',
      field: 'subtotalSinIva',
      minWidth: 140,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'SUBTOT C/IVA',
      field: 'subtotalConIva',
      minWidth: 140,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'IVA',
      field: 'iva',
      minWidth: 110,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
    {
      headerName: 'TOTAL',
      field: 'total',
      minWidth: 120,
      type: 'rightAligned',
      valueFormatter: (p) => this.moneyFormatter(p),
    },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const hoy = this.toISODate(new Date());

    this.filtrosForm = this.fb.group({
      desde: [hoy, Validators.required],
      hasta: [hoy, Validators.required],
      tipo: ['FACTURAS' as TipoDocumento, Validators.required],
      numeroCaja: [''],
    });
  }

  onGridReady(e: GridReadyEvent<FacturaElectronicaRow>) {
    this.gridApi = e.api;

    // Asegura que el grid use el rowData actual
    this.gridApi.setGridOption('rowData', this.rowData);

    this.gridApi.sizeColumnsToFit();
    if (!this.rowData.length) this.gridApi.showNoRowsOverlay();
  }

  async buscar() {
    if (this.filtrosForm.invalid) {
      this.filtrosForm.markAllAsTouched();
      return;
    }

    const { desde, hasta, tipo, numeroCaja } = this.filtrosForm.value as {
      desde: string;
      hasta: string;
      tipo: TipoDocumento;
      numeroCaja: string;
    };

    try {
      this.loading = true;
      this.gridApi?.showLoadingOverlay();

      // TODO: reemplazar por tu servicio real
      // const data = await firstValueFrom(this.reenvioService.getFacturas({ desde, hasta, tipo, numeroCaja }));
      const data = await this.mockBuscar(desde, hasta, tipo, numeroCaja);

      this.setRowDataInGrid(data);

      if (!data?.length) this.gridApi?.showNoRowsOverlay();
      else this.gridApi?.hideOverlay();

      this.gridApi?.deselectAll();
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
    } catch {
      this.setRowDataInGrid([]);
      this.gridApi?.showNoRowsOverlay();
    } finally {
      this.loading = false;
    }
  }

  nuevo() {
    const hoy = this.toISODate(new Date());

    this.filtrosForm.reset({
      desde: hoy,
      hasta: hoy,
      tipo: 'FACTURAS',
      numeroCaja: '',
    });

    this.setRowDataInGrid([]);
    this.gridApi?.deselectAll();
    this.gridApi?.showNoRowsOverlay();
  }

  generarXml() {
    const selected = this.gridApi?.getSelectedRows() ?? [];
    if (!selected.length) return;


    console.log('Generar/Reenviar XML para:', selected);
  }

  accionM() {
    console.log('Acción M');
  }

  private setRowDataInGrid(data: FacturaElectronicaRow[]) {
    // Mantiene sincronizado Angular + AG Grid v33 (rowData como Grid Option)
    this.rowData = data ?? [];
    this.gridApi?.setGridOption('rowData', this.rowData);
  }

  private moneyFormatter(p: ValueFormatterParams) {
    const v = Number(p.value ?? 0);
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private toISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async mockBuscar(
    desde: string,
    hasta: string,
    tipo: TipoDocumento,
    numeroCaja: string
  ): Promise<FacturaElectronicaRow[]> {
    await new Promise((r) => setTimeout(r, 450));

    if (numeroCaja && numeroCaja.trim() === '0') return [];

    return [
      {
        noFactura: '0010100000075',
        fecha: '14/11/2025',
        ruc: '1701115170001',
        cliente: 'MULLO SANDOVAL JOSE MILTON',
        subtotalSinIva: 0,
        subtotalConIva: 165.0,
        iva: 24.75,
        total: 189.75,
      },
    ];
  }
}
