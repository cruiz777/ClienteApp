// doc-electronicos.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams
} from 'ag-grid-community';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DocumentosService,
  DocumentoGrid,
  TipoDocumento,
} from 'src/app/services/docs-elect.service';
import { AccionesCellRendererComponent } from './acciones-cell-renderer.component';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, NativeDateAdapter, DateAdapter } from '@angular/material/core';
import { PDFDocument } from 'pdf-lib';
import { forkJoin } from 'rxjs';

export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: Object): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${this.padZero(day)}/${this.padZero(month)}/${year}`;
  }

  private padZero(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }
}
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Component({
  selector: 'app-doc-electronicos',
  templateUrl: './doc-electronicos.component.html',
  styleUrls: ['./doc-electronicos.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: DateAdapter, useClass: CustomDateAdapter },
  ], 
})
export class DocElectronicosComponent implements OnInit {
  tipoDocumentoActivo: TipoDocumento = 'FACTURA';

  filtrosForm: FormGroup;
  columnDefs: ColDef<DocumentoGrid>[] = [];
  defaultColDef: ColDef;
  rowData: DocumentoGrid[] = [];

  private gridApi?: GridApi<DocumentoGrid>;
  loading = false;
  currentPage = 1;        // ⬅️ AGREGAR
  pageSize = 20;          // ⬅️ AGREGAR
  totalItems = 0;
  constructor(
    private fb: FormBuilder,
    private docService: DocumentosService,
    private snackBar: MatSnackBar
  ) {
    // ⬅️ FECHAS POR DEFECTO: 1° del mes actual hasta hoy
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.filtrosForm = this.fb.group({
      fechaDesde: [primerDiaMes], // ⬅️ Por defecto: 1° del mes
      fechaHasta: [hoy],           // ⬅️ Por defecto: hoy
      textoBusqueda: [''],
    });

    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
    };

    this.columnDefs = [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 48,
        pinned: 'left',
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        lockPosition: true,
      },
      // Índice
      {
        headerName: '#',
        width: 60,
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        sortable: false,
        filter: false,
        menuTabs: [],
      },

      { headerName: 'F. Emisión', field: 'fechaEmision', width: 120 },
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

      // ===== COLUMNA ACCIÓN CON 4 BOTONES =====
      {
        headerName: 'Acción',
        colId: 'acciones',
        width: 180,
        pinned: 'right',
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        cellRenderer: AccionesCellRendererComponent, // ⬅️ Usa el componente
        cellRendererParams: {
          onVerPDF: (claveAcceso: string) => this.verPDF(claveAcceso),
          onVerXML: (claveAcceso: string) => this.verXML(claveAcceso),
          onReenviar: (id: number, claveAcceso: string) => this.reenviarCorreo(id, claveAcceso),
          onAnular: (id: number) => this.anularDocumento(id),
        },

        suppressMovable: true,
      },
    ];
  }

  ngOnInit(): void {
    console.log('🚀 Iniciando componente de documentos electrónicos');
  }

  onGridReady(e: GridReadyEvent<DocumentoGrid>): void {
    console.log('✅ Grid listo');
    this.gridApi = e.api;
    this.cargarDocumentos(); // ⬅️ CARGAR DATOS AL INICIO
  }


  onTipoDocumentoChange(tipo: TipoDocumento): void {
    if (this.tipoDocumentoActivo === tipo) return;
    this.tipoDocumentoActivo = tipo;
    this.cargarDocumentos();
  }
  buscar(): void {
    console.log('🔍 Buscando...');
    this.cargarDocumentos();
  }


  clearSearchText(): void {
    this.filtrosForm.patchValue({ textoBusqueda: '' });
    this.buscar();
  }

  async imprimirSeleccionadas(): Promise<void> {
    if (!this.gridApi) return;

    const seleccionadas = this.gridApi.getSelectedRows() as DocumentoGrid[];

    if (!seleccionadas.length) {
      this.snackBar.open('Seleccione al menos un documento.', 'Cerrar', { duration: 3000 });
      return;
    }

    const aptas = seleccionadas.filter(d => d.puedeReimprimir);

    if (!aptas.length) {
      this.snackBar.open('Ningún documento seleccionado está autorizado.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.snackBar.open(`Generando PDF con ${aptas.length} documento(s)...`, '', { duration: 2500 });

    try {
      // ⬅️ Descargar en lotes de 10 para no saturar el servidor
      const LOTE = 10;
      const buffers: ArrayBuffer[] = [];

      for (let i = 0; i < aptas.length; i += LOTE) {
        const lote = aptas.slice(i, i + LOTE);
        const resultados = await forkJoin(
          lote.map(doc => this.docService.obtenerPDFComoArrayBuffer(doc.claveAcceso))
        ).toPromise() as ArrayBuffer[];
        buffers.push(...resultados);

        // Actualizar progreso
        this.snackBar.open(
          `Descargando... ${Math.min(i + LOTE, aptas.length)} de ${aptas.length}`,
          '',
          { duration: 1500 }
        );
      }

      // Fusionar todos los PDFs
      const mergedPdf = await PDFDocument.create();

      for (const buffer of buffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `documentos_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      this.snackBar.open(`✅ ${aptas.length} documento(s) descargados.`, 'Cerrar', { duration: 3000 });

    } catch (err: any) {
      this.snackBar.open(`❌ Error: ${err.message}`, 'Cerrar', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  private verPDF(claveAcceso: string): void {
    console.log('📄 Abriendo PDF:', claveAcceso);
    this.docService.abrirPDF(claveAcceso);
    this.snackBar.open('Abriendo PDF...', 'Cerrar', { duration: 2000 });
  }

  private verXML(claveAcceso: string): void {
    console.log('📑 Descargando XML:', claveAcceso);
    this.docService.descargarYGuardar(claveAcceso, 'XML');
    this.snackBar.open('Descargando XML...', 'Cerrar', { duration: 2000 });
  }

  private reenviarCorreo(id: number, claveAcceso: string): void {
    console.log('📧 Reenviar correo:', { id, claveAcceso });

    const email = prompt(
      'Ingrese el correo electrónico de destino:\n(Deje en blanco para usar los correos de la factura)\n(Puede ingresar múltiples correos separados por ; o ,'
    );

    // Si presiona Cancelar, salir
    if (email === null) {
      return;
    }

    // Si deja en blanco, usar correos del XML
    const correosDestino = email.trim() || undefined;

    this.loading = true;
    this.docService.reenviarDocumento(claveAcceso, correosDestino).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.type === 'success') {
          this.snackBar.open(
            `✅ Correo enviado exitosamente a: ${response.data?.correo_enviado_a}`,
            'Cerrar',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            response.message || 'Advertencia al enviar',
            'Cerrar',
            { duration: 4000 }
          );
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al reenviar:', error);
        this.snackBar.open(
          `❌ Error: ${error.message}`,
          'Cerrar',
          { duration: 5000 }
        );
      },
    });
  }

  private anularDocumento(id: number): void {
    console.log('🚫 Anular documento:', id);

    const confirmar = confirm('¿Está seguro de que desea anular este documento?');
    if (!confirmar) return;

    const observacion = prompt('Ingrese el motivo de anulación:');
    if (!observacion || observacion.trim() === '') {
      this.snackBar.open('Debe ingresar un motivo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.docService.anularDocumento(id, observacion.trim()).subscribe({
      next: (response) => {
        console.log('✅ Documento anulado:', response);
        if (response.type === 'success') {
          this.snackBar.open('Documento anulado correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.cargarDocumentos(); // Recargar lista
        } else {
          this.snackBar.open(response.message || 'Error al anular', 'Cerrar', {
            duration: 3000,
          });
        }
      },
      error: (error) => {
        console.error('❌ Error al anular:', error);
        this.snackBar.open(
          `Error: ${error.message || 'No se pudo anular el documento'}`,
          'Cerrar',
          { duration: 3000 }
        );
      },
    });
  }

  // ========================================
  // CARGA DE DATOS
  // ========================================

  private cargarDocumentos(): void {
    const { fechaDesde, fechaHasta, textoBusqueda } = this.filtrosForm.value;

    console.log('📥 Cargando documentos...');
    this.loading = true;

    this.docService
      .listarDocumentos(
        this.tipoDocumentoActivo,
        fechaDesde,
        fechaHasta,
        textoBusqueda,
        1,     // ⬅️ Siempre página 1 por ahora
        1000   // ⬅️ Traer todos los registros
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Documentos recibidos:', response.docs.length);
          this.rowData = response.docs;
          this.totalItems = response.totalItems;
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error:', error);
          this.snackBar.open(`Error: ${error.message}`, 'Cerrar', { duration: 5000 });
          this.loading = false;
          this.rowData = [];
        },
      });
  }



  private formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null) return '';
    return '$' + Number(params.value).toFixed(2);
  }
}
