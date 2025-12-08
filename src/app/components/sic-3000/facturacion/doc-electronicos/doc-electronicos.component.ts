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

type TipoDocumento = 'FACTURA' | 'NC' | 'ND' | 'RET';

@Component({
  selector: 'app-doc-electronicos',
  templateUrl: './doc-electronicos.component.html',
  styleUrls: ['./doc-electronicos.component.css'],
})
export class DocElectronicosComponent implements OnInit {
  /** Tipo de documento seleccionado en el combo */
  tipoDocumentoActivo: TipoDocumento = 'FACTURA';

  filtrosForm: FormGroup;
  columnDefs: ColDef<DocElectronico>[] = [];
  defaultColDef: ColDef;
  rowData: DocElectronico[] = [];

  private gridApi?: GridApi<DocElectronico>;

  constructor(
    private fb: FormBuilder,
    private docService: DocElectronicosService,
    private snackBar: MatSnackBar
  ) {
    // Formulario de filtros
    this.filtrosForm = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      textoBusqueda: [''],
    });

    // Configuración por defecto de columnas
    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
    };

    // Definición de columnas
    this.columnDefs = [
      // Columna índice (1, 2, 3, ...)
      {
        headerName: '#',
        width: 60,
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        sortable: false,
        filter: false,
        menuTabs: [],
      },

      // ===== COLUMNA ACCIÓN CON 4 ÍCONOS PEQUEÑOS =====
      {
        headerName: 'Acción',
        colId: 'acciones',
        width: 120,
        pinned: 'right',
        suppressHeaderMenuButton: true,
        menuTabs: [],
        cellRenderer: () => {
          // OJO: cambia los nombres de los íconos según tus archivos reales en assets/icons
          return `
            <div class="acciones-inline">
              <button class="ag-action-btn" data-action="ver" title="Ver documento">
                <img src="assets/icons/icon-ver.png" alt="Ver" />
              </button>
              <button class="ag-action-btn" data-action="xml" title="Ver XML">
                <img src="assets/icons/icon-xml.png" alt="XML" />
              </button>
              <button class="ag-action-btn" data-action="pdf" title="Ver PDF">
                <img src="assets/icons/icon-pdf.png" alt="PDF" />
              </button>
              <button class="ag-action-btn" data-action="mail" title="Enviar correo">
                <img src="assets/icons/icon-mail.png" alt="Mail" />
              </button>
            </div>
          `;
        },
      },

      { headerName: 'F. Emisión', field: 'fechaEmision', width: 110 },
      { headerName: 'Estb', field: 'estab', width: 80 },
      { headerName: 'P. Emisión', field: 'ptoEmision', width: 110 },
      { headerName: 'Secuencial', field: 'secuencial', width: 120 },
      {
        headerName: 'Razón Social',
        field: 'razonSocial',
        minWidth: 220,
        flex: 1,
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Estado',
        field: 'estado',
        minWidth: 250,
      },
      {
        headerName: 'Fecha Autorizada',
        field: 'fechaAutorizada',
        minWidth: 180,
      },
      { headerName: 'RUC', field: 'ruc', minWidth: 130 },
      { headerName: 'Clave de Acceso', field: 'claveAcceso', minWidth: 220 },
    ];
  }

  ngOnInit(): void {
    // Para ver la tabla con datos de prueba:
    this.cargarDatosPrueba();

    // Cuando tengas el backend listo, puedes usar:
    // this.cargarDocumentos();
  }

  onGridReady(e: GridReadyEvent<DocElectronico>): void {
    this.gridApi = e.api as GridApi<DocElectronico>;
  }

  /** Cambio de tipo de documento desde el combo */
  onTipoDocumentoChange(tipo: TipoDocumento): void {
    if (this.tipoDocumentoActivo === tipo) {
      return;
    }
    this.tipoDocumentoActivo = tipo;
    this.cargarDocumentos();
  }

  buscar(): void {
    this.cargarDocumentos();
  }

  clearSearchText(): void {
    this.filtrosForm.patchValue({ textoBusqueda: '' });
    this.buscar();
  }

  /** Imprime PDFs de las filas seleccionadas */
  imprimirSeleccionadas(): void {
    if (!this.gridApi) {
      return;
    }

    // Obtener directamente las filas seleccionadas
    const seleccionadas = this.gridApi.getSelectedRows() as DocElectronico[];

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

  /** Llamada al backend para listar documentos */
  private cargarDocumentos(): void {
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

  /** Datos de prueba para que se vea la grilla mientras tanto */
  private cargarDatosPrueba(): void {
    this.rowData = [
      {
        id: 1,
        tipo: 'FACTURA',
        fechaEmision: '22-05-2025',
        estab: '001',
        ptoEmision: '012',
        secuencial: '000002205',
        razonSocial: 'Moscoso Toledo Cristóbal',
        total: 230.0,
        estado:
          'Estado Documento: AUTORIZADO. Fecha de autorización: 2025-05-22T15:59:57',
        fechaAutorizada: '2025-05-22T15:59:57',
        ruc: '010179856001',
        claveAcceso: '2205202500002205001012...',
      },
      {
        id: 2,
        tipo: 'FACTURA',
        fechaEmision: '28-11-2025',
        estab: '001',
        ptoEmision: '010',
        secuencial: '000007527',
        razonSocial: 'MESTIZA S.A.',
        total: 747.5,
        estado:
          'Estado Documento: AUTORIZADO. Fecha de autorización: 2025-11-28T09:50:00',
        fechaAutorizada: '2025-11-28T09:50:00',
        ruc: '0999999999001',
        claveAcceso: '22051128000075270001010...',
      },
    ];
  }

  /** Formato de moneda para la columna Total */
  private formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null) {
      return '';
    }
    return '$' + Number(params.value).toFixed(2);
  }
}
