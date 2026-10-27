// doc-elec-locales.component.ts
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
  ComparacionFila,
  EstadoComparacion
} from 'src/app/services/docs-elect.service';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, NativeDateAdapter, DateAdapter } from '@angular/material/core';
import { AccionesCellRendererComponent } from '../doc-electronicos/acciones-cell-renderer.component';
import { forkJoin } from 'rxjs';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PDFDocument } from 'pdf-lib';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';

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
  selector: 'app-doc-elec-locales',
  templateUrl: './doc-elec-locales.component.html',
  styleUrls: ['./doc-elec-locales.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: DateAdapter, useClass: CustomDateAdapter },
  ], 
})
export class DocElecLocalesComponent implements OnInit {
  
  tipoDocumentoActivo: TipoDocumento = 'FACTURA';
  filtroAnulados: string = 'todos';
// CAMBIAR los tipos de documentos disponibles para iterar en el HTML
readonly tiposDocumento: { key: TipoDocumento; label: string }[] = [
  { key: 'FACTURA',     label: 'Facturas' },
  { key: 'NC',          label: 'Notas de Crédito' },
  { key: 'ND',          label: 'Notas de Débito' },
  { key: 'RET',         label: 'Retenciones' },
  { key: 'LIQUIDACION', label: 'Liquidaciones' },
];

  rowClassRules = {
    'row-no-encontrado': (p: any) => p.data?.estadoComparacion === 'NO_ENCONTRADO',
    'row-no-autorizado': (p: any) => p.data?.estadoComparacion === 'NO_AUTORIZADO',
    'fila-anulada': (p: any) => p.data?.estaAnuladoErp || p.data?.estaAnuladoSri
  };
  filtrosForm: FormGroup;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  private gridApi?: GridApi<any>;

    defaultColDef: ColDef;
  loading = false;
  currentPage = 1;        // ⬅️ AGREGAR
  pageSize = 20;          // ⬅️ AGREGAR
  totalItems = 0;
  constructor(
    private fb: FormBuilder,
    private docService: DocumentosService,
    private snackBar: MatSnackBar,
    private usuarioService: UsuarioService,
    private dialog: MatDialog 
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
    this.columnDefs = this.obtenerColumnas('FACTURA');
    
    // this.columnDefs = [
    //   {
    //     headerCheckboxSelection: true,
    //     checkboxSelection: true,
    //     width: 48,
    //     pinned: 'left',
    //     suppressHeaderMenuButton: true,
    //     sortable: false,
    //     filter: false,
    //     lockPosition: true,
    //   },
    //   {
    //     headerName: 'Acción',
    //     colId: 'acciones',
    //     width: 180,
    //     pinned: 'right',
    //     suppressHeaderMenuButton: true,
    //     sortable: false,
    //     filter: false,
    //     cellRenderer: AccionesCellRendererComponent,
    //     cellRendererParams: {
    //       onVerPDF:   (ca: string)             => this.verPDF(ca),
    //       onVerXML:   (ca: string)             => this.verXML(ca),
    //       onReenviar: (id: number, ca: string) => this.reenviarCorreo(id, ca),
    //       onAnular:   (id: number)             => this.anularDocumento(id),
    //     },
    //     suppressMovable: true,
    //   },
    //   {
    //     headerName: '#', width: 60,
    //     valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    //     sortable: false, filter: false, menuTabs: [],
    //   },
    //         {
    //     headerName: 'Estado',
    //     field: 'estadoComparacion',
    //     width: 150,
    //     cellStyle: (p) => {
    //       if (p.value === 'NO_ENCONTRADO') return { color: '#b91c1c', fontWeight: 'bold' };
    //       if (p.value === 'NO_AUTORIZADO') return { color: '#92400e', fontWeight: 'bold' };
    //       return { color: '#166534', fontWeight: 'bold' };
    //     },
    //     valueFormatter: (p) => {
    //       if (p.value === 'NO_ENCONTRADO') return '❌ No enviado';
    //       if (p.value === 'NO_AUTORIZADO') return '⚠️ No autorizado';
    //       return '✅ Autorizado';
    //     }
    //   },
    //   { headerName: 'Observación SRI', field: 'observacion',      minWidth: 220 },
    //   { headerName: 'Tipo',    field: 'tipoDocumento',   width: 130 },
    //   { headerName: 'Número Doc.',  field: 'numeroDocumento', width: 180 },
    //   { headerName: 'Fecha',   field: 'fecha',           width: 110 },
    //   { headerName: 'F. Autorización', field: 'fechaAutorizacion',width: 160 },
    //   { headerName: 'RUC',     field: 'rucCliente',      width: 140 },
    //   { headerName: 'Cliente', field: 'nombreCliente',   minWidth: 200, flex: 1 },
    //   {
    //     headerName: 'Total', field: 'total', width: 110,
    //     valueFormatter: (p) => this.formatoMoneda(p),
    //     type: 'rightAligned',
    //   },
    //   // ── Campos del SRI ──────────────────────────────
    //   { headerName: 'Estb',            field: 'establecimiento',  width: 80  },
    //   { headerName: 'Pto. Emisión',    field: 'puntoEmision',     width: 110 },
    //   { headerName: 'Secuencial',      field: 'secuencial',       width: 130 }
    // ];
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
    this.tipoDocumentoActivo = tipo;
    this.currentPage = 1;        // ← resetear página
    this.columnDefs = this.obtenerColumnas(tipo);
    this.cargarDocumentos();
  }

  private obtenerColumnas(tipo: TipoDocumento): ColDef[] {
    // ── Columnas fijas que SIEMPRE aparecen ──
    const fijas: ColDef[] = [
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
      {
        headerName: 'Acción',
        colId: 'acciones',
        width: 180,
        pinned: 'right',
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        cellRenderer: AccionesCellRendererComponent,
        cellRendererParams: {
          onVerPDF:   (ca: string)             => this.verPDF(ca),
          onVerXML:   (ca: string)             => this.verXML(ca),
          onReenviar: (id: number, ca: string) => this.reenviarCorreo(id, ca),
          onAnular:   (id: number)             => this.anularDocumento(id),
          isAnulado:  (data: any) => data.estaAnuladoErp || data.estaAnuladoSri
        },
        suppressMovable: true,
      },
      {
        headerName: '#', width: 60,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        sortable: false, filter: false, menuTabs: [],
      },
      {
        headerName: 'Estado',
        field: 'estadoComparacion',
        width: 160,
        cellStyle: (p) => {
          if (p.data?.estaAnuladoErp || p.data?.estaAnuladoSri) {
            return { color: '#b91c1c', fontWeight: 'bold' };
          }
          // Lo demás igual
          if (p.value === 'NO_ENCONTRADO') return { color: '#b91c1c', fontWeight: 'bold' };
          if (p.value === 'NO_AUTORIZADO') return { color: '#92400e', fontWeight: 'bold' };
          return { color: '#166534', fontWeight: 'bold' };
        },
        valueFormatter: (p) => {        
          if (p.data?.estaAnuladoErp || p.data?.estaAnuladoSri) {
            return '🚫 Anulado';
          }
          // Lo demás igual
          if (p.value === 'NO_ENCONTRADO') return '❌ No enviado';
          if (p.value === 'NO_AUTORIZADO') return '⚠️ No autorizado';
          return '✅ Autorizado';
        }
      },
      { headerName: 'Observación SRI',  field: 'observacion',       minWidth: 220 },
      { headerName: 'RUC',               field: 'rucCliente',        width: 140    },
      { headerName: 'Cliente',           field: 'nombreCliente',     minWidth: 200, flex: 1 },
      { headerName: 'Número Doc.',       field: 'numeroDocumento',   width: 180    },
      { 
        headerName: 'Fecha', field: 'fecha', width: 140,
        cellStyle: (p) => p.data?.fechasCoinciden
          ? { color: '#1b5e38', fontWeight: 'bold', background: '#d0ead9' }
          : { color: '#c0392b', fontWeight: 'bold', background: '#fde8e6' }
      },
      { 
        headerName: 'F. Autorización', field: 'fechaAutorizacion', width: 160,
        cellStyle: (p) => {
          if (!p.data?.fechaAutorizacion) return null;
          return p.data?.fechasCoinciden
            ? { color: '#1b5e38', fontWeight: 'bold', background: '#d0ead9' }
            : { color: '#c0392b', fontWeight: 'bold', background: '#fde8e6' }
        }
      },
      { headerName: 'Clave de Acceso',  field: 'claveAcceso',       minWidth: 220 },
      {
        headerName: 'Total', field: 'total', width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base 0%', field: 'baseCero', width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Base IVA', field: 'baseIva', width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'IVA', field: 'totalIva', width: 100,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      {
        headerName: 'Descuento', field: 'descuento', width: 110,
        valueFormatter: (p) => this.formatoMoneda(p),
        type: 'rightAligned',
      },
      { headerName: 'Estb',          field: 'establecimiento', width: 80  },
      { headerName: 'Pto. Emisión',  field: 'puntoEmision',    width: 110 },
      { headerName: 'Secuencial',    field: 'secuencial',      width: 130 },
    ];

    // ── Columnas extras solo para NC ──
    const colsNC: ColDef[] = [
      { headerName: 'N° Factura Ref.',  field: 'numeroFacturaRef', width: 160 },
      { headerName: 'Fecha Fact. Ref.', field: 'fechaFacturaRef',  width: 150 },
    ];

    return tipo === 'NC' ? [...fijas, ...colsNC] : fijas;
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

    const seleccionadas = this.gridApi.getSelectedRows();

    if (!seleccionadas.length) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '360px',
        data: { title: 'Atención', message: 'Seleccione al menos un documento.', type: 'warning', showCancel: false, confirmText: 'Aceptar' }
      });
      return;
    }

    const aptas = seleccionadas.filter(d => d.puedeReimprimir);

    if (!aptas.length) {
      this.dialog.open(CustomMessageBoxComponent, {
        width: '360px',
        data: { title: 'Atención', message: 'Ningún documento seleccionado está autorizado.', type: 'warning', showCancel: false, confirmText: 'Aceptar' }
      });
      return;
    }

    const dialogRef = this.dialog.open<CustomMessageBoxComponent>(CustomMessageBoxComponent, {
      disableClose: true,
      width: '400px',
      data: {
        title: 'Generando PDF',
        message: 'Descargando e integrando documentos...',
        type: 'info',
        isLoading: true,
        showProgress: true,
        currentProgress: 0,
        totalProgress: aptas.length,
        loadingText: `Procesando: 0 de ${aptas.length} (0%)`,
      }
    });

    try {
      const mergedPdf = await PDFDocument.create();
      const LOTE = 10;
      let procesados = 0;

      for (let i = 0; i < aptas.length; i += LOTE) {
        const lote = aptas.slice(i, i + LOTE);
        const resultados = await forkJoin(
          lote.map(doc => this.docService.obtenerPDFComoArrayBuffer(doc.claveAcceso))
        ).toPromise() as ArrayBuffer[];

        for (const buffer of resultados) {
          const pdf = await PDFDocument.load(buffer);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
          
          procesados++;
          dialogRef.componentInstance!.updateProgress(procesados, aptas.length);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `documentos_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      dialogRef.close();
      this.dialog.open(CustomMessageBoxComponent, {
        width: '360px',
        data: { title: '¡Listo!', message: `<b>${aptas.length}</b> documento(s) descargados correctamente.`, type: 'success', showCancel: false, confirmText: 'Aceptar' }
      });

    } catch (err: any) {
      dialogRef.close();
      this.dialog.open(CustomMessageBoxComponent, {
        width: '360px',
        data: { title: 'Error', message: `No se pudo generar el PDF: <b>${err.message}</b>`, type: 'error', showCancel: false, confirmText: 'Cerrar' }
      });
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

  cargarDocumentos(): void {
    const { fechaDesde, fechaHasta, textoBusqueda } = this.filtrosForm.value;
    this.loading = true;

    //Consulta de anulados
    let soloAnulados: boolean | null = null;
    if (this.filtroAnulados === 'anulados') soloAnulados = false;
    if (this.filtroAnulados === 'no_anulados') soloAnulados = true;
    
    console.log('🔍 VERIFICAR:', {
      filtroAnulados: this.filtroAnulados,
      soloAnulados: soloAnulados,
      tipo: typeof soloAnulados
    });
    forkJoin({
      erp: this.docService.obtenerDocumentosErp(
        fechaDesde, fechaHasta, this.tipoDocumentoActivo,
        this.usuarioService.getEmpresaId(),  // idEmpresa
        1,     // page siempre 1
        9999   // pageSize
      ),
      sri: this.docService.listarTodosDocumentosRaw(
        fechaDesde, fechaHasta,
        1,     // page ← siempre 1
        9999   // pageSize
      ),
    }).subscribe({
      next: ({ erp, sri }) => {
        const cruce = this.docService.cruzarDocumentos(erp.docs, sri.docs);

        this.rowData = cruce.map((c) => ({
          estadoComparacion:  c.estadoComparacion,
          tipoDocumento:      c.erp.tipoDocumento,
          numeroDocumento:    c.erp.numeroDocumento,
          fecha: (c.erp.tipoDocumento === 'FACTURA' || c.erp.tipoDocumento === 'NOTA_CREDITO')
            ? c.erp.fecha?.replace('T', ' ').substring(0, 16) ?? ''
            : c.erp.fecha?.split('T')[0] ?? '',
          rucCliente:         c.erp.rucCliente ?? '',
          nombreCliente:      c.erp.nombreCliente ?? '',
          total:              c.erp.total,
          establecimiento:    c.erp.establecimiento ?? c.docElectronico?.establecimiento ?? '—',
          puntoEmision:       c.erp.puntoEmision    ?? c.docElectronico?.punto_emision   ?? '—',
          secuencial:         c.erp.secuencial      ?? c.docElectronico?.secuencial      ?? '—',
          observacion:        c.docElectronico?.observacion     ?? '—',
          fechaAutorizacion:  c.docElectronico?.fecha_autorizacion ?? null,
          fechasCoinciden: (() => {
            if (!c.erp.fecha || !c.docElectronico?.fecha_autorizacion) return false;
            const f1 = new Date(c.erp.fecha);
            const f2 = new Date(c.docElectronico.fecha_autorizacion);
            return f1.getFullYear() === f2.getFullYear()
                && f1.getMonth()    === f2.getMonth()
                && f1.getDate()     === f2.getDate();
          })(),
          id:                 c.docElectronico?.id_estado_documento ?? 0,
          puedeReimprimir:    c.estadoComparacion === 'AUTORIZADO',
          claveAcceso:        c.docElectronico?.clave_acceso ?? '',  
          baseCero:           c.erp.baseCero    ?? 0,
          baseIva:            c.erp.baseIva     ?? 0,
          totalIva:           c.erp.totalIva    ?? 0,
          descuento:          c.erp.descuento   ?? 0,
          numeroFacturaRef:   c.erp.numeroFacturaRef  ?? null,
          fechaFacturaRef:    c.erp.fechaFacturaRef?.split('T')[0] ?? null,
          estaAnuladoErp: c.erp.estaAnulado,
          estaAnuladoSri: (c.docElectronico?.observacion ?? '').toUpperCase().includes('ANULA')
       }));

       if (this.filtroAnulados === 'anulados') {
        this.rowData = this.rowData.filter(d => d.estaAnuladoErp || d.estaAnuladoSri);
      } else if (this.filtroAnulados === 'no_anulados') {
        this.rowData = this.rowData.filter(d => !d.estaAnuladoErp && !d.estaAnuladoSri);
      }
        this.totalItems = this.rowData.length;
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open(`Error: ${err.message}`, 'Cerrar', { duration: 5000 });
        this.loading = false;
        this.rowData = [];
      },
    });
  }
  rowNoEncontrado = (p: any) => p.data?.estadoComparacion === 'NO_ENCONTRADO';
  rowNoAutorizado = (p: any) => p.data?.estadoComparacion === 'NO_AUTORIZADO';


  private formatoMoneda(params: ValueFormatterParams): string {
    if (params.value == null) return '';
    return '$' + Number(params.value).toFixed(2);
  }
}
