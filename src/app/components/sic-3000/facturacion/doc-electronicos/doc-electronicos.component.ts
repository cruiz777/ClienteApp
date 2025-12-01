import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DocElectronicosService,
  DocElectronico,
} from 'src/app/services/doc-electronicos.service';
@Component({
  selector: 'app-doc-electronicos',
  templateUrl: './doc-electronicos.component.html',
  styleUrls: ['./doc-electronicos.component.css'],
})
export class DocElectronicosComponent implements OnInit {
  // Tab activo
  tipoDocumentoActivo: 'FACTURA' | 'NC' | 'ND' | 'RET' = 'FACTURA';

  filtrosForm: FormGroup;
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {};
  rowData: DocElectronico[] = [];

  private gridApi!: GridApi;

  constructor(
    private fb: FormBuilder,
    private docService: DocElectronicosService,
    private snackBar: MatSnackBar
  ) {
    this.filtrosForm = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      textoBusqueda: [''],
    });

    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
    };

    this.columnDefs = [
      {
        headerName: '',
        field: 'seleccion',
        width: 40,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        pinned: 'left',
        menuTabs: [],
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        headerName: 'Acción',
        field: 'accion',
        width: 120,
        sortable: false,
        filter: false,
        menuTabs: [],
        cellRenderer: () => {
          return `
            <div class="acciones-cell">
              <span class="icon-btn" title="Ver PDF">📄</span>
              <span class="icon-btn" title="XML">🗎</span>
              <span class="icon-btn" title="Enviar">✉</span>
              <span class="icon-btn icon-danger" title="Anular">✖</span>
            </div>
          `;
        },
      },
      { headerName: 'F. Emisión', field: 'fechaEmision', width: 120 },
      { headerName: 'Estb', field: 'estab', width: 80 },
      { headerName: 'P. Emisión', field: 'ptoEmision', width: 110 },
      { headerName: 'Secuencial', field: 'secuencial', width: 120 },
      {
        headerName: 'Razón Social',
        field: 'razonSocial',
        minWidth: 200,
        flex: 1,
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 110,
        valueFormatter: this.formatoMoneda,
      },
      { headerName: 'Estado', field: 'estado', minWidth: 160 },
      {
        headerName: 'Fecha Autorizada',
        field: 'fechaAutorizada',
        minWidth: 160,
      },
      { headerName: 'RUC', field: 'ruc', minWidth: 120 },
      { headerName: 'Clave de Acceso', field: 'claveAcceso', minWidth: 200 },
    ];
  }

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  // Cambiar entre Factura / NC / ND / Retenciones
  cambiarTab(tipo: 'FACTURA' | 'NC' | 'ND' | 'RET'): void {
    if (this.tipoDocumentoActivo === tipo) {
      return;
    }
    this.tipoDocumentoActivo = tipo;
    this.cargarDocumentos();
  }

  // Carga los documentos según tab activo y filtros
  cargarDocumentos(): void {
    const { fechaDesde, fechaHasta, textoBusqueda } = this.filtrosForm.value;

    this.docService
      .listarDocumentos(
        this.tipoDocumentoActivo,
        fechaDesde,
        fechaHasta,
        textoBusqueda
      )
      .subscribe({
        next: (docs) => {
          this.rowData = docs;
        },
        error: () => {
          this.snackBar.open(
            'Error al cargar los documentos electrónicos.',
            'Cerrar',
            { duration: 3000 }
          );
        },
      });
  }

  buscar(): void {
    this.cargarDocumentos();
  }

  clearSearchText(): void {
    this.filtrosForm.patchValue({ textoBusqueda: '' });
    this.buscar();
  }

  // Imprime PDFs de las filas seleccionadas
  imprimirSeleccionadas(): void {
    if (!this.gridApi) {
      return;
    }

    const selectedNodes = this.gridApi.getSelectedNodes();
    const seleccionadas = selectedNodes.map(
      (n) => n.data as DocElectronico
    );

    if (!seleccionadas.length) {
      this.snackBar.open(
        'Debe seleccionar al menos un documento para imprimir.',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    seleccionadas.forEach((doc) => {
      this.docService
        .obtenerPdfDocumento(this.tipoDocumentoActivo, doc.id)
        .subscribe({
          next: (blob) => {
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
          },
          error: () => {
            this.snackBar.open(
              `Error al imprimir el documento ${doc.secuencial}.`,
              'Cerrar',
              { duration: 3000 }
            );
          },
        });
    });
  }

  // Formato de moneda para columna Total
  formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null) {
      return '';
    }
    return '$' + Number(params.value).toFixed(2);
  }
}
