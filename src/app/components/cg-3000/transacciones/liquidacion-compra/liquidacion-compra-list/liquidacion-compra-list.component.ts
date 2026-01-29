import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellClickedEvent,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
  ColumnResizedEvent,
} from 'ag-grid-community';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';

//import { FacturasProveedorFormComponent } from '../facturas-proveedor-form/facturas-proveedor-form.component';
import { LiquidacionCompraFormComponent } from '../liquidacion-compra-form/liquidacion-compra-form.component';

import { ListadoAsientoContableResponse } from 'src/app/interfaces/responses/asientos-contables-response';

//import { FacturasProveedorService } from 'src/app/services/facturas-proveedor.service';
import { LiquidacionCompraService } from 'src/app/services/liquidacion-compra.service';

import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { UsuarioService } from 'src/app/services/usuario.service';
import { RetencionesFormComponent } from '../../retenciones/retenciones-form/retenciones-form.component';
//OPCIONES XML
import { XmlOpcionesDialogComponent, XmlDialogAction } from './xml-opciones-dialog.component';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
//import * as XLSX from 'xlsx';
import * as XLSX from 'xlsx-js-style';

import { AsientoContableResponse } from 'src/app/interfaces/responses/asiento-contable-response';
import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { MotivoNoAnulacionAsientoResponse } from 'src/app/interfaces/responses/MotivoNoAnulacionAsientoResponse ';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-liquidacion-compra-ag',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MatDialogModule],
  templateUrl: './liquidacion-compra-list.component.html',
  styleUrls: ['./liquidacion-compra-list.component.css']
})
export class LiquidacionCompraComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  loading = false;
  error: string | null = null;

  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 90
  };

  // Ajusto columnas SOLO 1 vez
  private didInitialFit = false;
  private userResizedAnyColumn = false;

  private gridApi!: GridApi<ListadoAsientoContableResponse>;

  // ✅ CAMBIO CLAVE: sizeColumnsToFit SOLO 1 VEZ, y respetando suppressSizeToFit
  gridOptions: GridOptions<ListadoAsientoContableResponse> = {
    rowHeight: 28,
    headerHeight: 35,
    alwaysShowVerticalScroll: true,
    suppressLoadingOverlay: true,
    suppressNoRowsOverlay: true,
    colResizeDefault: 'shift',

    /*
    onFirstDataRendered: () => {
      this.fitColumnsOnce();
    }
    */

  };

  rowData: ListadoAsientoContableResponse[] = [];

  searchTerm = '';
  fechaDesde: string | null = null; // yyyy-MM-dd
  fechaHasta: string | null = null;

  columnDefs: ColDef<ListadoAsientoContableResponse>[] = [
    { headerName: 'Código', field: 'idCabMaestro', width: 160, sortable: true, filter: true, hide: true },
    { headerName: 'Empresa', field: 'empresa', width: 160, sortable: true, filter: true, hide: true },

    // ✅ CAMBIO CLAVE: estas 2 columnas quedan FIJAS en 240 y NO las toca sizeColumnsToFit
    {
      headerName: 'Fecha Transacción',
      field: 'fechatransaccion',
      width: 140,
      minWidth: 140,
      //suppressSizeToFit: true,
      sortable: true,
      filter: true,
      valueGetter: p => p.data?.fechatransaccion ? new Date(p.data.fechatransaccion as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    {
      headerName: 'Fecha Ingreso',
      field: 'fechaingreso',
      width: 140,
      minWidth: 140,
      //suppressSizeToFit: true,
      sortable: true,
      filter: true,
      valueGetter: p => p.data?.fechaingreso ? new Date(p.data.fechaingreso as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },

    { headerName: 'Tipo Asiento', field: 'tipoAsientoCompleto', width: 150, sortable: true, filter: true },
    { headerName: 'No. Documento', field: 'numdoc', width: 150, sortable: true, filter: true },
    {
      headerName: 'Debe',
      field: 'totdebe',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0
      }
    },
    {
      headerName: 'Haber',
      field: 'tothaber',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0
      }
    },
    { headerName: 'Beneficiario', field: 'beneficiario', width: 360, sortable: true, filter: true },
    { headerName: 'Observación', field: 'observacion', width: 300, sortable: true, filter: true },

    // ✅ NUEVO: idCabLiquidacion
    {
      headerName: 'Id Liquidación',
      field: 'idCabLiquidacion',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => (p.value == null ? '' : String(p.value)),
      cellClass: 'cell-center',  hide: true 
    },

   {
      headerName: 'Enviado Liq',
      field: 'enviado',
      width: 110,
      sortable: true,
      filter: true,

      // ✅ No editable
      editable: false,

      // ✅ Evita que AG Grid lo trate como boolean/checkbox “default” (pequeño)
      cellDataType: 'text',

      // ✅ checkbox grande + SOLO lectura (no click)
      cellRenderer: (p: any) => {
        const b = normalizeEnviado(p.value ?? p.data?.enviado);

        const checked = b === true ? 'checked' : '';
        const cls = b === true ? 'env-cell env-cell--true' :
                    b === false ? 'env-cell env-cell--false' :
                    'env-cell env-cell--null';

        return `
          <div class="${cls}" title="${b === true ? 'ENVIADO' : b === false ? 'PENDIENTE' : ''}">
            <input class="env-check" type="checkbox" ${checked} tabindex="-1" aria-hidden="true" />
          </div>
        `;
      },

      // ✅ centra
      cellClass: 'cell-center',
      // ✅ bloquea teclas (space/enter) sobre esa celda
      suppressKeyboardEvent: () => true,
      },

      //nombre archivo pdfpdf
      {
        headerName: 'Documento SRI',
        field: 'documentoSri',
        width: 190,
        minWidth: 170,
        sortable: true,
        filter: true,
        // evita "undefined" / null
        valueFormatter: p => (p.value == null ? '' : String(p.value)),
        // opcional: que se pueda copiar fácil
        cellClass: 'cell-center',
        hide: true
      },

    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 165,
      resizable: false,
      suppressSizeToFit: true,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      menuTabs: [],
      
      /*
      cellRenderer: (p: any) => {
        const enviado = normalizeEnviado(p.data?.enviado);

        const xmlCls = enviado === true
          ? 'accion-icon--xml accion-icon--xml-enviado'
          : 'accion-icon--xml accion-icon--xml-pendiente';

        const xmlTitle = enviado === true
          ? 'XML generado (ver/descargar)'
          : 'Generar XML';

        const xmlIcon = enviado === true
          ? 'assets/icons/xml-ge.png'
          : 'assets/icons/xml-pg.png';

        return `
          <div class="acciones-cell">
            <button class="accion-icon accion-icon--pdf" data-action="print" title="Imprimir Asiento">
              <img src="assets/icons/icon-imprimir.png" width="18" height="18" alt="PDF" />
            </button>

            <button class="accion-icon accion-icon--pdf" data-action="ret" title="Generar Retención">
              <img src="assets/icons/icon-transaccion.png" width="18" height="18" alt="Retención" />
            </button>

            <!-- ✅ XML -->
            <button class="accion-icon ${xmlCls}" data-action="xml" title="${xmlTitle}">
              <img src="${xmlIcon}" width="18" height="18" alt="XML" />
            </button>

            <button class="ag-action-btn danger" data-action="delete" title="Eliminar Asiento">
              <img src="assets/icons/icon-basurero.png" width="18" height="18" />
            </button>
          </div>
        `;
      },

      */
    cellRenderer: (p: any) => {
      const enviado = normalizeEnviado(p.data?.enviado);
      const idLiq = Number(p.data?.idCabLiquidacion ?? 0);

      const xmlCls = enviado === true
        ? 'accion-icon--xml accion-icon--xml-enviado'
        : 'accion-icon--xml accion-icon--xml-pendiente';

      const xmlTitle = enviado === true ? 'XML generado (opciones)' : 'XML pendiente (opciones)';
      const xmlIcon = enviado === true
        ? 'assets/icons/xml-desc.png'
        : 'assets/icons/xml-pg.png';

      const disabledAttr = (!idLiq || idLiq <= 0) ? 'disabled' : '';

      return `
        <div class="acciones-cell">
          <button class="accion-icon accion-icon--pdf" data-action="print" title="Imprimir Asiento">
            <img src="assets/icons/icon-imprimir.png" width="18" height="18" alt="PDF" />
          </button>

          <button class="accion-icon accion-icon--pdf" data-action="ret" title="Generar Retención">
            <img src="assets/icons/icon-transaccion.png" width="18" height="18" alt="Retención" />
          </button>

          <button class="accion-icon ${xmlCls}" data-action="xml" title="${xmlTitle}" ${disabledAttr}>
            <img src="${xmlIcon}" width="18" height="18" alt="XML" />
          </button>

          <button class="ag-action-btn danger" data-action="delete" title="Eliminar Asiento">
            <img src="assets/icons/icon-basurero.png" width="18" height="18" />
          </button>
        </div>
      `;
    },

      sortable: false,
      filter: false
    }

  ];


  /* iconos que estaban antes
  <div class="acciones-cell">
          <button class="accion-icon accion-icon--edit" data-action="edit" title="Editar Asiento">
            <img src="assets/icons/icon-modificar-3.png" width="18" height="18" alt="Editar" />
          </button>
          <button class="accion-icon accion-icon--pdf" data-action="print" title="Imprimir Asiento">
            <img src="assets/icons/icon-imprimir.png" width="18" height="18" alt="PDF" />
          </button>
          <button class="accion-icon accion-icon--copy" data-action="copy" title="Duplicar Factura">
            <img src="assets/icons/icon-ficha-cliente.png" width="18" height="18" alt="Duplicar" />
          </button>
          <button class="accion-icon accion-icon--pdf" data-action="ret" title="Generar Retención">
            <img src="assets/icons/icon-transaccion.png" width="18" height="18" alt="Retención" />
          </button>
          <button class="ag-action-btn danger" data-action="delete" title="Eliminar Asiento">
            <img src="assets/icons/icon-basurero.png" width="18" height="18" />
          </button>
        </div>

  */

  constructor(
    //private facturasService: FacturasProveedorService,
    private liquidacionCompraService: LiquidacionCompraService,
    private dialog: MatDialog,
    private usuarioService: UsuarioService,
    private asientosService: AsientosContablesService
  ) {}

  ngOnInit(): void {
    this.setFechasMesActual();
    this.obtenerAsientos();
  }

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api as GridApi<ListadoAsientoContableResponse>;

    // Detecta cuando el usuario redimensiona (para NO volver a auto-ajustar)
    this.gridApi.addEventListener('columnResized', (ev: ColumnResizedEvent) => {
      if (ev.finished && ev.source === 'uiColumnDragged') {
        this.userResizedAnyColumn = true;
      }
    });
  }

  // ✅ AJUSTE 1 SOLA VEZ (y no toca columnas con suppressSizeToFit)
  private fitColumnsOnce(): void {
    if (!this.gridApi) return;
    if (this.didInitialFit) return;
    if (this.userResizedAnyColumn) return;

    this.didInitialFit = true;

    requestAnimationFrame(() => {
      try { this.gridApi.sizeColumnsToFit(); } catch {}
    });
  }

  obtenerAsientos(): void {
    this.loading = true;
    this.error = null;

    if (!this.fechaDesde || !this.fechaHasta) {
      this.loading = false;
      this.rowData = [];
      return;
    }

    //this.facturasService.GetListado(this.fechaDesde, this.fechaHasta).subscribe({
    this.liquidacionCompraService.GetListado(this.fechaDesde, this.fechaHasta).subscribe({
      next: (resp: ListadoAsientoContableResponse[]) => {
        this.rowData = resp ?? [];
        this.loading = false;

        // ❌ IMPORTANTE: YA NO sizeColumnsToFit aquí (esto era lo que te cambiaba los widths)
      },
      error: (err) => {
        console.error('Error al obtener facturas proveedor:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.rowData = [];
        this.loading = false;
      }
    });
  }

  buscar(): void {
    this.obtenerAsientos();
  }

  onCellClicked(evt: CellClickedEvent<ListadoAsientoContableResponse>): void {
   
    if (evt?.colDef?.colId !== 'acciones') return;

    const target = evt.event?.target as HTMLElement | null;
    if (!target) return;

    const actionElement = target.closest('[data-action]') as HTMLElement | null;
    if (!actionElement) return;

    const action = actionElement.getAttribute('data-action');

    if (action === 'edit' && evt.data) {
      this.editarAsiento(evt.data);
      return;
    }
    
    /*  revisar cambio hr 16012025
    if (action === 'copy' && evt.data) {
      const id = Number(evt.data.idCabMaestro || 0);
      this.crearFacturaEstandar(id);
      return;
    }
    */

    if (action === 'print' && evt.data) {
      const idCab = Number(evt.data.idCabMaestro || 0);
      this.imprimirAsiento(idCab);
      return;
    }

    if (action === 'ret' && evt.data) {
      const idCabMaestro = Number((evt.data as any).idCabMaestro ?? 0);
      const idEmpresa = Number((evt.data as any).idEmpresa ?? (evt.data as any).IdEmpresa ?? 1);

      if (!idCabMaestro || idCabMaestro <= 0) {
        console.warn('No se encontró idCabMaestro para la fila:', evt.data);
        return;
      }

      this.abrirRetenciones(idEmpresa, idCabMaestro);
      return;
    }

    if (action === 'delete') {
      if (!evt.data) { return; }
      //this.confirmarEliminar(evt.data);

      const enviado = normalizeEnviado((evt.data as any).enviado);
      if (enviado === true) {
        const numero = String((evt.data as any).numdoc ?? '');
        const tipoDoc = String((evt.data as any).tipoAsientoCompleto ?? '');
        const documentoSri = String((evt.data as any).documentoSri ?? '').trim();

        const etiqueta = `${tipoDoc}-${numero}`.trim();
        const extra = documentoSri ? `\nDocumento SRI: ${documentoSri}` : '';

        this.mostrarMensaje({
          type: 'warning',
          title: 'No permitido',
          message: `No se puede eliminar porque el documento ya fue enviado al SRI.\n\nAsiento: ${etiqueta}${extra}`,
          showCancel: false,
          confirmText: 'Aceptar'
        });
        return;
      }
      this.confirmarEliminar(evt.data);
      return;
    }

    ///XML
    if (action === 'xml' && evt.data) {
      const idCabLiquidacion = Number((evt.data as any).idCabLiquidacion ?? 0);
      if (!idCabLiquidacion || idCabLiquidacion <= 0) return;

      const enviado = normalizeEnviado((evt.data as any).enviado);
      const numdoc = String((evt.data as any).numdoc ?? '');
      const beneficiario = String((evt.data as any).beneficiario ?? '');
      const tipoDocumento = String((evt.data as any).tipoAsientoCompleto ?? '').trim();

      const ref = this.dialog.open(XmlOpcionesDialogComponent, {
        width: '410px',
        autoFocus: false,
        restoreFocus: false,
        disableClose: false,
        data: { enviado, numdoc, beneficiario,tipoDocumento }
      });

      ref.afterClosed().subscribe((r: XmlDialogAction) => {
        if (!r) return;

        if (r === 'generar') {
          
          this.generarXml(idCabLiquidacion, evt);
          return;
        }

        if (r === 'descargar') {
          
          const documentoSri = String((evt.data as any)?.documentoSri ?? '').trim();
          this.descargarPdf(idCabLiquidacion, documentoSri);
          //this.descargarPdf(idCabLiquidacion);
          return;
        }
      });

      return;
    }

    ///

  }

  abrirRetenciones(idEmpresa: number, idCabMaestro: number): void {
    const dialogRef = this.dialog.open(RetencionesFormComponent, {
      width: '65vw',
      maxWidth: '65vw',
      height: '77vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      data: { modo: 'nuevo', idEmpresa, idCabMaestro }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerAsientos();
    });
  }

  nuevoAsiento(): void {
    this.abrirCrear();
  }

  editarAsiento(row: ListadoAsientoContableResponse): void {
    const id = Number((row as any).idCabMaestro ?? (row as any).IdCabMaestro ?? 0);
    if (!id || id <= 0) {
      console.warn('No se encontró idCabMaestro para la fila:', row);
      return;
    }

    const idEmpresa = Number((row as any).idEmpresa ?? (row as any).IdEmpresa ?? 0);
    const tipoDoc = String((row as any).tipoAsientoCompleto ?? '').trim();

    this.loading = true;
    this.asientosService.validarAnulacion(id, idEmpresa, tipoDoc)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resp) => {
          const data = resp?.data;
          if (!data) {
            this.abrirEditar(id);
            return;
          }
          if (data.puedeAnular === false) {
            const numero = String((row as any).numdoc ?? '');
            const encabezado = `Asiento: ${tipoDoc}-${numero}`;
            const motivosTxt = this.formatearMotivosValidacion(data.motivos ?? []);
            const msgFinal =
              `${encabezado}\nNo se puede modificar.\n\n` +
              (motivosTxt || 'Revise los motivos.');

            this.mostrarMensaje({
              type: 'error',
              title: 'No se puede modificar',
              message: msgFinal,
              showCancel: false,
              confirmText: 'Aceptar',
            })
            .afterClosed()
            .subscribe(() => {
              //this.dialog.open(FacturasProveedorFormComponent, {  
              this.dialog.open(LiquidacionCompraFormComponent, {
                width: '75vw',
                maxWidth: '95vw',
                height: '90vh',
                panelClass: 'asiento-dialog',
                autoFocus: false,
                restoreFocus: false,
                disableClose: true,
                data: {
                  modo: 'editar',
                  id: id,
                  soloLectura: true,
                  motivoSoloLectura: msgFinal
                }
              });
            });
            return;
          }
          this.abrirEditar(id);
        },
        error: (err) => {
          console.error('Error al validar edición:', err);
          const msg =
            err?.error?.message ??
            err?.error?.Message ??
            err?.message ??
            'Error inesperado al validar si puede modificarse la factura.';
          this.mostrarMensaje({
            type: 'error',
            title: 'Error de validación',
            message: msg,
            showCancel: false,
            confirmText: 'Aceptar'
          });
        }
      });
  }

  abrirCrear(): void {
    //const dialogRef = this.dialog.open(FacturasProveedorFormComponent, {
    const dialogRef = this.dialog.open(LiquidacionCompraFormComponent, {    
      width: '75vw',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      data: { modo: 'nuevo' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerAsientos();
    });
  }

  abrirEditar(id: number): void {
    //const dialogRef = this.dialog.open(FacturasProveedorFormComponent, {
    const dialogRef = this.dialog.open(LiquidacionCompraFormComponent, {    
      width: '75vw',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      data: { modo: 'editar', id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.obtenerAsientos();
    });
  }

  private setFechasMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth();

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);

    this.fechaDesde = toInputDate(primerDia);
    this.fechaHasta = toInputDate(ultimoDia);
  }

  /* ================== CABECERA PARA REPORTES ================== */

  private getCabeceraTexto(): { titulo: string; lineas: string[] } {
    const formatoFechaInput = (f: string | null) => {
      if (!f) { return ''; }
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };

    const titulo = 'Listado Liquidación Compras';

    const lineas: string[] = [
      `Rango de fechas: ${formatoFechaInput(this.fechaDesde)} al ${formatoFechaInput(this.fechaHasta)}`,
      this.searchTerm ? `Filtro de búsqueda: ${this.searchTerm}` : ''
    ].filter(x => !!x);

    return { titulo, lineas };
  }

  /* ========== EXPORTAR EXCEL ========== */

  onExportExcel(): void {
  if (!this.gridApi) return;

  const cab = this.getCabeceraTexto();
  const fechaStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const visibleCols = this.columnDefs.filter(c => !c.hide && c.colId !== 'acciones');
  const colCount = visibleCols.length;

  // ========= helpers =========
  const excelSerial = (dt: Date): number => {
    const utc = Date.UTC(
      dt.getFullYear(),
      dt.getMonth(),
      dt.getDate(),
      dt.getHours(),
      dt.getMinutes(),
      dt.getSeconds()
    );
    return utc / 86400000 + 25569;
  };

  const parseDateOnly = (v: any): Date | null => {
    if (!v) return null;
    const s = String(v);
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7));
    const d = Number(s.slice(8, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0);
  };

  const parseDateTime = (v: any): Date | null => {
    if (!v) return null;
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const getCell = (ws: XLSX.WorkSheet, r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    return ws[addr];
  };

  const fmt2 = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const borderSoft = {
    top: { style: 'thin', color: { rgb: 'D9D9D9' } },
    bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
    left: { style: 'thin', color: { rgb: 'D9D9D9' } },
    right: { style: 'thin', color: { rgb: 'D9D9D9' } },
  };

  // ========= estilos =========
  // ✅ FILA 1 SIN COLOR (solo título en negrita)
  const styleTitlePlain = {
    font: { bold: true, sz: 14, name: 'Calibri', color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  // ✅ FILA 2 SIN FONDO (blanca)
  const styleInfoBase = {
    font: { bold: false, sz: 10, name: 'Calibri', color: { rgb: '000000' } },
    alignment: { vertical: 'center' },
  };
  const styleInfoLeft = { ...styleInfoBase, alignment: { horizontal: 'left', vertical: 'center' } };
  const styleInfoCenter = { ...styleInfoBase, alignment: { horizontal: 'center', vertical: 'center' } };
  const styleInfoRight = { ...styleInfoBase, alignment: { horizontal: 'right', vertical: 'center' } };

  const styleHeader = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: '0070C0' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderSoft,
  };

  const styleText = {
    font: { sz: 10, name: 'Calibri', color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: borderSoft,
  };

  const styleCenter = {
    font: { sz: 10, name: 'Calibri', color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderSoft,
  };

  const styleNumber = {
    font: { sz: 10, name: 'Calibri', color: { rgb: '000000' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderSoft,
  };

  const styleRowAlt = {
    fill: { patternType: 'solid', fgColor: { rgb: 'F7F7F7' } },
  };

  const styleZero = {
    font: { sz: 10, name: 'Calibri', color: { rgb: '7F7F7F' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderSoft,
  };

  const styleTotals = {
    font: { bold: true, sz: 10, name: 'Calibri' },
    fill: { patternType: 'solid', fgColor: { rgb: 'E6E6E6' } },
    alignment: { vertical: 'center' },
    border: borderSoft,
  };

  const styleTotalsRight = {
    ...styleTotals,
    alignment: { horizontal: 'right', vertical: 'center' },
  };

  const styleTotalsTopDouble = {
    top: { style: 'double', color: { rgb: '7F7F7F' } },
    bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
    left: { style: 'thin', color: { rgb: 'D9D9D9' } },
    right: { style: 'thin', color: { rgb: 'D9D9D9' } },
  };

  // ========= construir AOA =========
  const headerRow = visibleCols.map(c => c.headerName || c.field);
  const aoa: any[][] = [];

  // Fila 1: Título (SIN color)
  aoa.push([cab.titulo]);

  // Fila 2: info en 3 bloques: izquierda / centro / derecha
  const rangoTxt = cab.lineas[0] ?? '';
  const generadoTxt = `Generado: ${now.toLocaleDateString('es-EC')} ${now.toLocaleTimeString('es-EC')}`;
  const userTxt = this.nombreusuario ? `Usuario: ${this.nombreusuario}` : '';

  const infoRow = new Array(colCount).fill('');

  // posiciones “bonitas” para 8 cols: A..C | D..E | F..H
  const leftEnd = Math.min(2, colCount - 1);
  const midStart = Math.min(leftEnd + 1, colCount - 1);
  const midEnd = Math.min(midStart + 1, colCount - 1);
  const rightStart = Math.min(midEnd + 1, colCount - 1);

  // ✅ Orden requerido: PRIMERO Generado, DESPUÉS Usuario
  infoRow[0] = rangoTxt;
  if (colCount > 1) infoRow[midStart] = generadoTxt;  // centro = Generado
  if (colCount > 2) infoRow[rightStart] = userTxt;    // derecha = Usuario

  aoa.push(infoRow);

  // Fila 3: blanco
  aoa.push([]);

  // Fila 4: headers tabla
  aoa.push(headerRow);

  // ========= dataset + totales =========
  let totalDebe = 0;
  let totalHaber = 0;

  const rowsData: any[] = [];
  this.gridApi.forEachNodeAfterFilterAndSort(node => {
    if (!node.data) return;
    rowsData.push(node.data);

    const debe = Number((node.data as any).totdebe || 0);
    const haber = Number((node.data as any).tothaber || 0);
    if (!isNaN(debe)) totalDebe += debe;
    if (!isNaN(haber)) totalHaber += haber;
  });

  for (const r of rowsData) {
    const row: any[] = [];
    for (const col of visibleCols) {
      const field = col.field as string;
      let value = (r as any)[field];

      // ✅ numdoc SIEMPRE texto
      if (field === 'numdoc') {
        value = (value === null || value === undefined) ? '' : String(value);
      }

      row.push(value);
    }
    aoa.push(row);
  }

  const saldo = totalDebe - totalHaber;
  const totalsRow = visibleCols.map(col => {
    switch (col.field) {
      case 'numdoc': return 'TOTALES:';
      case 'totdebe': return totalDebe;
      case 'tothaber': return totalHaber;
      case 'observacion': return `Saldo: ${fmt2(saldo)}`;
      default: return '';
    }
  });
  aoa.push(totalsRow);

  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);

  // ========= merges =========
  const merges: any[] = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }); // A1..H1

  // Fila 2: A2:C2 | D2:E2 | F2:H2
  if (leftEnd > 0) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: leftEnd } });
  if (midEnd > midStart) merges.push({ s: { r: 1, c: midStart }, e: { r: 1, c: midEnd } });
  if (colCount - 1 > rightStart) merges.push({ s: { r: 1, c: rightStart }, e: { r: 1, c: colCount - 1 } });

  ws['!merges'] = merges;

  // ========= freeze panes =========
  (ws as any)['!sheetViews'] = [{ state: 'frozen', xSplit: 1, ySplit: 4 }];

  // ========= anchos columnas =========
  const maxLen = (v: any) => (v == null ? 0 : String(v).length);
  const colMax: number[] = new Array(colCount).fill(0);

  for (let c = 0; c < colCount; c++) colMax[c] = Math.max(colMax[c], maxLen(headerRow[c]));
  for (let r = 0; r < rowsData.length; r++) {
    const rowIndex = 4 + r;
    for (let c = 0; c < colCount; c++) {
      const cell = getCell(ws, rowIndex, c);
      colMax[c] = Math.max(colMax[c], maxLen(cell?.v));
    }
  }
  for (let c = 0; c < colCount; c++) {
    const cell = getCell(ws, 4 + rowsData.length, c);
    colMax[c] = Math.max(colMax[c], maxLen(cell?.v));
  }

  ws['!cols'] = visibleCols.map((col, idx) => {
    let wch = Math.min(Math.max(colMax[idx] + 2, 10), 55);
    if (col.field === 'fechatransaccion') wch = Math.max(wch, 16);
    if (col.field === 'fechaingreso') wch = Math.max(wch, 22);
    if (col.field === 'beneficiario') wch = Math.max(wch, 32);
    if (col.field === 'observacion') wch = Math.max(wch, 42);
    if (col.field === 'tipoAsientoCompleto') wch = Math.max(wch, 18);
    if (col.field === 'numdoc') wch = Math.max(wch, 24);
    if (col.field === 'totdebe' || col.field === 'tothaber') wch = Math.max(wch, 14);
    return { wch };
  });

  // ========= alturas =========
  ws['!rows'] = [
    { hpt: 24 }, // fila 1 (sin color)
    { hpt: 18 }, // fila 2 (blanca)
    { hpt: 8 },  // separador
    { hpt: 20 }, // header tabla
  ];

  // ========= estilos fila 1 (SIN COLOR) =========
  for (let c = 0; c < colCount; c++) {
    const cell = getCell(ws, 0, c);
    if (cell) cell.s = styleTitlePlain;
  }

  // ========= estilos fila 2 (blanca) =========
  for (let c = 0; c < colCount; c++) {
    const cell = getCell(ws, 1, c);
    if (!cell) continue;

    if (c <= leftEnd) cell.s = styleInfoLeft;
    else if (c >= midStart && c <= midEnd) cell.s = styleInfoCenter;
    else if (c >= rightStart) cell.s = styleInfoRight;
    else cell.s = styleInfoBase;
  }

  // ========= estilos header tabla =========
  const headerR = 3;
  for (let c = 0; c < colCount; c++) {
    const cell = getCell(ws, headerR, c);
    if (cell) cell.s = styleHeader;
  }

  // ========= estilos data + formatos =========
  const firstDataR = 4;
  const totalsR = 4 + rowsData.length;

  for (let r = firstDataR; r <= totalsR; r++) {
    const isTotalsRow = r === totalsR;
    const isAlt = !isTotalsRow && ((r - firstDataR) % 2 === 1);

    for (let c = 0; c < colCount; c++) {
      const col = visibleCols[c];
      const field = col.field as string;
      const cell = getCell(ws, r, c);
      if (!cell) continue;

      if (isTotalsRow) {
        cell.s = { ...styleTotals, border: styleTotalsTopDouble };
        continue;
      }

      if (field === 'fechatransaccion') {
        const dt = parseDateOnly(cell.v);
        if (dt) {
          cell.t = 'n';
          cell.v = excelSerial(dt);
          cell.z = 'dd/mm/yyyy';
        }
        cell.s = { ...styleCenter, ...(isAlt ? styleRowAlt : {}) };
        continue;
      }

      if (field === 'fechaingreso') {
        const dt = parseDateTime(cell.v);
        if (dt) {
          cell.t = 'n';
          cell.v = excelSerial(dt);
          cell.z = 'dd/mm/yyyy hh:mm:ss';
        }
        cell.s = { ...styleCenter, ...(isAlt ? styleRowAlt : {}) };
        continue;
      }

      if (field === 'numdoc') {
        cell.t = 's';
        cell.v = cell.v == null ? '' : String(cell.v);
        cell.z = '@';
        cell.s = { ...styleCenter, ...(isAlt ? styleRowAlt : {}) };
        continue;
      }

      if (field === 'totdebe' || field === 'tothaber') {
        const n = Number(cell.v ?? 0);
        cell.t = 'n';
        cell.v = isNaN(n) ? 0 : n;
        cell.z = '#,##0.00';
        const base = (cell.v === 0) ? styleZero : styleNumber;
        cell.s = { ...base, ...(isAlt ? styleRowAlt : {}) };
        continue;
      }

      const base = (field === 'tipoAsientoCompleto') ? styleCenter : styleText;
      cell.s = { ...base, ...(isAlt ? styleRowAlt : {}) };
    }
  }

  // ========= estilos fila totales =========
  for (let c = 0; c < colCount; c++) {
    const col = visibleCols[c];
    const field = col.field as string;
    const cell = getCell(ws, totalsR, c);
    if (!cell) continue;

    if (field === 'totdebe' || field === 'tothaber') {
      const n = Number(cell.v ?? 0);
      cell.t = 'n';
      cell.v = isNaN(n) ? 0 : n;
      cell.z = '#,##0.00';
      cell.s = { ...styleTotalsRight, border: styleTotalsTopDouble };
    } else if (field === 'numdoc' || field === 'observacion') {
      cell.t = 's';
      cell.v = cell.v == null ? '' : String(cell.v);
      cell.z = '@';
      cell.s = {
        ...styleTotals,
        alignment: { horizontal: 'left', vertical: 'center' },
        border: styleTotalsTopDouble
      };
    } else {
      cell.s = { ...styleTotals, border: styleTotalsTopDouble };
    }
  }

  // ========= rango + autofiltro =========
  const lastColLetter = XLSX.utils.encode_col(colCount - 1);
  const lastRowNumber = totalsR + 1;
  ws['!ref'] = `A1:${lastColLetter}${lastRowNumber}`;
  ws['!autofilter'] = { ref: `A4:${lastColLetter}4` };

  // ========= workbook =========
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  XLSX.writeFile(wb, `Listado_LiquidacionCompra_${fechaStr}.xlsx`);
}


  /*
  onExportExcel(): void {
    if (!this.gridApi) return;

    const cab = this.getCabeceraTexto();
    const fechaStr = new Date().toISOString().slice(0, 10);

    const visibleCols = this.columnDefs.filter(c => !c.hide && c.colId !== 'acciones');
    const colCount = visibleCols.length;

    // ========= helpers =========
    const excelSerial = (dt: Date): number => {
      const utc = Date.UTC(
        dt.getFullYear(),
        dt.getMonth(),
        dt.getDate(),
        dt.getHours(),
        dt.getMinutes(),
        dt.getSeconds()
      );
      return utc / 86400000 + 25569;
    };

    const parseDateOnly = (v: any): Date | null => {
      if (!v) return null;
      const s = String(v);
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(5, 7));
      const d = Number(s.slice(8, 10));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d, 0, 0, 0);
    };

    const parseDateTime = (v: any): Date | null => {
      if (!v) return null;
      const dt = new Date(v);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const getCell = (ws: XLSX.WorkSheet, r: number, c: number) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      return ws[addr];
    };

    const borderThin = {
      top: { style: 'thin', color: { rgb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
      left: { style: 'thin', color: { rgb: 'BFBFBF' } },
      right: { style: 'thin', color: { rgb: 'BFBFBF' } },
    };

    const styleTitle = {
      font: { bold: true, sz: 12, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
    };

    const styleSub = {
      font: { bold: true, sz: 10, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
    };

    const styleHeader = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: '0070C0' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };

    const styleText = {
      font: { sz: 10, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: borderThin,
    };

    const styleCenter = {
      font: { sz: 10, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderThin,
    };

    const styleNumber = {
      font: { sz: 10, name: 'Calibri' },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: borderThin,
    };

    const styleTotals = {
      font: { bold: true, sz: 10, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: 'E6E6E6' } },
      alignment: { vertical: 'center' },
      border: borderThin,
    };

    const styleTotalsRight = {
      ...styleTotals,
      alignment: { horizontal: 'right', vertical: 'center' },
    };

    // ========= construir AOA =========
    const headerRow = visibleCols.map(c => c.headerName || c.field);
    const aoa: any[][] = [];

    aoa.push([cab.titulo]);
    aoa.push([cab.lineas[0] ?? '']);
    aoa.push([]);
    aoa.push(headerRow);

    let totalDebe = 0;
    let totalHaber = 0;

    const rowsData: any[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort(node => {
      if (!node.data) return;
      rowsData.push(node.data);

      const debe = Number((node.data as any).totdebe || 0);
      const haber = Number((node.data as any).tothaber || 0);
      if (!isNaN(debe)) totalDebe += debe;
      if (!isNaN(haber)) totalHaber += haber;
    });

    for (const r of rowsData) {
      const row: any[] = [];

      for (const col of visibleCols) {
        const field = col.field as string;
        let value = (r as any)[field];

        // ✅ FIX: numdoc SIEMPRE como texto para evitar #######
        if (field === 'numdoc') {
          value = (value === null || value === undefined) ? '' : String(value);
        }

        row.push(value);
      }

      aoa.push(row);
    }

    const saldo = totalDebe - totalHaber;

    const totalsRow = visibleCols.map(col => {
      switch (col.field) {
        case 'numdoc': return 'TOTALES:';
        case 'totdebe': return totalDebe;
        case 'tothaber': return totalHaber;
        case 'observacion': return `Saldo: ${saldo.toFixed(2)}`;
        default: return '';
      }
    });
    aoa.push(totalsRow);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);

    // ========= merges =========
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    ];

    // ========= tamaños columnas =========
    ws['!cols'] = visibleCols.map(col => {
      let wch = 14;
      if (col.field === 'fechatransaccion') wch = 16;
      if (col.field === 'fechaingreso') wch = 22;
      if (col.field === 'beneficiario') wch = 32;
      if (col.field === 'observacion') wch = 42;
      if (col.field === 'tipoAsientoCompleto') wch = 18;

      // ✅ FIX: más ancho y texto
      if (col.field === 'numdoc') wch = 24;

      if (col.field === 'totdebe' || col.field === 'tothaber') wch = 14;
      return { wch };
    });

    ws['!rows'] = [
      { hpt: 18 },
      { hpt: 16 },
      { hpt: 8 },
      { hpt: 18 },
    ];

    // ========= estilos título/subtítulo =========
    const a1 = getCell(ws, 0, 0);
    if (a1) a1.s = styleTitle;

    const a2 = getCell(ws, 1, 0);
    if (a2) a2.s = styleSub;

    // ========= estilos header =========
    const headerR = 3;
    for (let c = 0; c < colCount; c++) {
      const cell = getCell(ws, headerR, c);
      if (cell) cell.s = styleHeader;
    }

    // ========= estilos data + formatos =========
    const firstDataR = 4;
    const totalsR = 4 + rowsData.length;

    for (let r = firstDataR; r <= totalsR; r++) {
      for (let c = 0; c < colCount; c++) {
        const col = visibleCols[c];
        const field = col.field as string;
        const cell = getCell(ws, r, c);
        if (!cell) continue;

        const isTotalsRow = (r === totalsR);

        if (isTotalsRow) {
          cell.s = styleTotals;
          continue;
        }

        if (field === 'fechatransaccion') {
          const dt = parseDateOnly(cell.v);
          if (dt) {
            cell.t = 'n';
            cell.v = excelSerial(dt);
            cell.z = 'dd/mm/yyyy';
            cell.s = styleCenter;
          } else {
            cell.s = styleCenter;
          }
          continue;
        }

        if (field === 'fechaingreso') {
          const dt = parseDateTime(cell.v);
          if (dt) {
            cell.t = 'n';
            cell.v = excelSerial(dt);
            cell.z = 'dd/mm/yyyy hh:mm:ss';
            cell.s = styleCenter;
          } else {
            cell.s = styleCenter;
          }
          continue;
        }

        // ✅ FIX: numdoc como TEXTO explícito (evita #######)
        if (field === 'numdoc') {
          cell.t = 's';
          cell.v = cell.v == null ? '' : String(cell.v);
          cell.z = '@'; // formato texto
          cell.s = styleCenter;
          continue;
        }

        if (field === 'totdebe' || field === 'tothaber') {
          const n = Number(cell.v ?? 0);
          cell.t = 'n';
          cell.v = isNaN(n) ? 0 : n;
          cell.z = '#,##0.00';
          cell.s = styleNumber;
          continue;
        }

        cell.s = styleText;
      }
    }

    // ========= estilos fila totales =========
    for (let c = 0; c < colCount; c++) {
      const col = visibleCols[c];
      const field = col.field as string;
      const cell = getCell(ws, totalsR, c);
      if (!cell) continue;

      if (field === 'totdebe' || field === 'tothaber') {
        const n = Number(cell.v ?? 0);
        cell.t = 'n';
        cell.v = isNaN(n) ? 0 : n;
        cell.z = '#,##0.00';
        cell.s = styleTotalsRight;
      } else if (field === 'numdoc' || field === 'observacion') {
        cell.t = 's';
        cell.v = cell.v == null ? '' : String(cell.v);
        cell.z = '@';
        cell.s = { ...styleTotals, alignment: { horizontal: 'left', vertical: 'center' } };
      } else {
        cell.s = styleTotals;
      }
    }

    // ========= rango y autofiltro =========
    const lastColLetter = XLSX.utils.encode_col(colCount - 1);
    const lastRowNumber = totalsR + 1;
    ws['!ref'] = `A1:${lastColLetter}${lastRowNumber}`;
    ws['!autofilter'] = { ref: `A4:${lastColLetter}4` };

    // ========= guardar =========
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `Listado_FacturasProveedor_${fechaStr}.xlsx`);
  }
  */

  /* ========== EXPORTAR PDF ========== */

  onExportPdf(): void {
    if (!this.gridApi) { return; }

    const cab = this.getCabeceraTexto();
    const doc = new jsPDF('l', 'pt', 'a4');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(cab.titulo, doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 60;
    cab.lineas.forEach(l => {
      doc.text(l, 40, y);
      y += 14;
    });

    const visibleCols = this.columnDefs.filter(c => !c.hide && c.colId !== 'acciones');
    const columns = visibleCols.map(col => ({
      header: col.headerName || col.field,
      dataKey: col.field as string
    }));

    const rows: any[] = [];
    let totalDebe = 0;
    let totalHaber = 0;

    this.gridApi.forEachNodeAfterFilterAndSort(node => {
      if (node.data) {
        const r: any = { ...(node.data as any) };

        const debe = Number(r.totdebe || 0);
        const haber = Number(r.tothaber || 0);
        if (!isNaN(debe)) totalDebe += debe;
        if (!isNaN(haber)) totalHaber += haber;

        ['totdebe', 'tothaber'].forEach(f => {
          if (r[f] != null && r[f] !== '') {
            const num = Number(r[f]);
            if (!isNaN(num)) r[f] = num.toFixed(2);
          }
        });

        ['fechatransaccion', 'fechaingreso'].forEach(f => {
          if (r[f]) {
            const dt = new Date(r[f]);
            const dd = dt.getDate().toString().padStart(2, '0');
            const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
            const yyyy = dt.getFullYear();
            r[f] = `${dd}/${mm}/${yyyy}`;
          }
        });

        rows.push(r);
      }
    });

    const saldo = totalDebe - totalHaber;

    autoTable(doc, {
      startY: y + 10,
      columns: columns as any,
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [29, 120, 159], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: () => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(str, doc.internal.pageSize.getWidth() - 60, doc.internal.pageSize.getHeight() - 10);
      }
    });

    const lastTable = (doc as any).lastAutoTable;
    const finalY = lastTable ? lastTable.finalY : (y + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Debe: ${totalDebe.toFixed(2)}`, 40, finalY + 20);
    doc.text(`Total Haber: ${totalHaber.toFixed(2)}`, 200, finalY + 20);
    doc.text(`Saldo: ${saldo.toFixed(2)}`, 360, finalY + 20);

    const fechaStr = new Date().toISOString().slice(0, 10);
    doc.output('dataurlnewwindow');
    doc.save(`Listado_LiquidacionCompra_${fechaStr}.pdf`);
  }


  private prepararPlantillaEstandar(facturaOriginal: AsientoContableResponse): AsientoContableResponse {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().substring(0, 10);
    const horaHoy = hoy.toISOString();

    return {
      ...facturaOriginal,
      IdCabMaestro: 0,
      numdoc: 0,
      observacion: '',
      fechatransaccion: fechaHoy,
      fechaingreso: horaHoy,

      detalles: (facturaOriginal.detalles || []).map((detalle, index) => ({
        ...detalle,
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: index + 1,
        fechatransaccion: fechaHoy,
        fechaingreso: horaHoy,
        debe: 0,
        haber: 0,
        nocomprobante: '',
        autorizacion: '',
        fechacaduca: '',
        fechavencimiento: '',
        docurelacionado: '',
        autorizacionRelacionado: '',
        fechaCadRelacionado: null as any,
        beneficiario: detalle.beneficiario || '',
        comentario: detalle.comentario || '',
      }))
    };
  }

  private imprimirAsiento(idCabMaestro: number): void {
    if (!idCabMaestro || idCabMaestro <= 0) {
      alert('No se encontró el identificador del asiento.');
      return;
    }

    this.loading = true;

    //this.facturasService.getAsientoImpresion(idCabMaestro).subscribe({
    this.liquidacionCompraService.getAsientoImpresion(idCabMaestro).subscribe({    
      next: (asiento: AsientoImpresion) => {
        this.loading = false;
        if (!asiento) {
          alert('No se encontraron datos para la impresión del asiento.');
          return;
        }
        generarPdfAsiento(asiento, this.nombreusuario);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al obtener asiento para impresión:', err);
        alert('Ocurrió un error al preparar la impresión del asiento.');
      }
    });
  }

  confirmarEliminar(row: ListadoAsientoContableResponse): void {
    const idCabMaestro = Number(row.idCabMaestro ?? 0);
    const idEmpresa = Number((row as any).idEmpresa ?? (row as any).IdEmpresa ?? 0);
    const idUsuario = Number(this.usuarioActual?.id_usuario ?? 0);

    if (!idCabMaestro || !idEmpresa || !idUsuario) {
      this.mostrarMensaje({
        type: 'error',
        title: 'Error',
        message: 'No se pudo obtener la información necesaria para eliminar el asiento.',
        showCancel: false,
        confirmText: 'Aceptar'
      });
      return;
    }

    const numero = String((row as any).numdoc ?? '');
    const tipoDoc = String((row as any).tipoAsientoCompleto ?? '');

    if (!tipoDoc) {
      this.mostrarMensaje({
        type: 'error',
        title: 'Error',
        message: 'No se pudo determinar el tipo de asiento (tipoDoc) para validar la eliminación.',
        showCancel: false,
        confirmText: 'Aceptar'
      });
      return;
    }

    this.loading = true;

    this.asientosService.validarAnulacion(idCabMaestro, idEmpresa, tipoDoc)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resp) => {
          const data = resp?.data;

          if (!data) {
            this.mostrarMensaje({
              type: 'error',
              title: 'Error',
              message: resp?.message || 'No se pudo validar la eliminación del asiento.',
              showCancel: false,
              confirmText: 'Aceptar'
            });
            return;
          }

          if (data.puedeAnular === false) {
            const encabezado = `Asiento: ${tipoDoc}-${numero}`;
            const motivosTxt = this.formatearMotivosValidacion(data.motivos ?? []);
            const msgFinal =
              `${encabezado}\n` +
              `No se puede eliminar/modificar.\n\n` +
              (motivosTxt || 'Revise los motivos.');

            this.mostrarMensaje({
              type: 'error',
              title: 'No se puede eliminar',
              message: msgFinal,
              showCancel: false,
              confirmText: 'Aceptar'
            });
            return;
          }

          const etiqueta = `${tipoDoc}-${numero}`;

          this.mostrarMensaje({
            type: 'warning',
            title: 'Confirmación',
            message: `¿Está seguro de eliminar el asiento ${etiqueta}?\n\nEsta acción NO se puede deshacer.`,
            showCancel: true,
            confirmText: 'Sí, eliminar',
            cancelText: 'No'
          })
          .afterClosed()
          .subscribe((confirmado: boolean) => {
            if (!confirmado) return;

            this.loading = true;

            this.asientosService.eliminar(idCabMaestro, idEmpresa, idUsuario)
              .pipe(finalize(() => (this.loading = false)))
              .subscribe({
                next: (delResp) => {
                  if (delResp?.type === 'DELETED') {
                    this.mostrarMensaje({
                      type: 'success',
                      title: 'Ok',
                      message: 'Asiento eliminado correctamente.',
                      showCancel: false,
                      confirmText: 'Aceptar'
                    }).afterClosed().subscribe(() => this.obtenerAsientos());
                  } else {
                    this.mostrarMensaje({
                      type: 'error',
                      title: 'Error',
                      message: delResp?.message || 'No se pudo eliminar el asiento.',
                      showCancel: false,
                      confirmText: 'Aceptar'
                    });
                  }
                },
                error: (err) => {
                  console.error('Error al eliminar asiento:', err);
                  const msg = err?.error?.message ?? err?.message ?? 'Error inesperado al eliminar el asiento.';
                  this.mostrarMensaje({
                    type: 'error',
                    title: 'Error',
                    message: msg,
                    showCancel: false,
                    confirmText: 'Aceptar'
                  });
                }
              });
          });
        },
        error: (err) => {
          console.error('Error al validar anulación:', err);
          const msg =
            err?.error?.message ??
            err?.error?.Message ??
            err?.message ??
            'Error inesperado al validar si el asiento puede eliminarse.';

          this.mostrarMensaje({
            type: 'error',
            title: 'Error de validación',
            message: msg,
            showCancel: false,
            confirmText: 'Aceptar'
          });
        }
      });
  }

  private mostrarMensaje(data: MessageBoxData) {
    return this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        ...data
      }
    });
  }

  private mostrarMensajeAdvertencia(mensaje: string): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: 'Campos obligatorios',
        message: mensaje,
        type: 'warning',
        confirmText: 'Entendido',
        showCancel: false
      }
    });
  }

  formatearMotivosValidacion(motivos: MotivoNoAnulacionAsientoResponse[]): string {
    if (!motivos || motivos.length === 0) return '';
    return motivos.map(m => {
      const codigo = String((m as any).codigo ?? '').toUpperCase();
      const mensaje = String((m as any).mensaje ?? '').trim();
      const detalle = String((m as any).detalle ?? '').trim();

      if (codigo === 'EG_TIENE_CUENTA_BANCO') {
        const cuentaNombre = this.extraerCuentaNombreBanco(detalle);
        return `Motivo: ${mensaje}\nCuenta banco: ${cuentaNombre || detalle}`;
      }
      if (codigo === 'ASIENTO_CONCILIADO') {
        return `Motivo: ${mensaje}`;
      }
      return `Motivo: ${mensaje}`;
    }).join('\n\n');
  }

  private extraerCuentaNombreBanco(detalle: string): string {
    if (!detalle) return '';
    const cuentaMatch = detalle.match(/Cuenta\s*:\s*([^,|]+)/i);
    const nombreMatch = detalle.match(/Nombre\s*:\s*([^|]+)/i);
    const cuenta = cuentaMatch?.[1]?.trim() ?? '';
    const nombre = nombreMatch?.[1]?.trim() ?? '';
    if (cuenta && nombre) return `${cuenta} - ${nombre}`;
    return detalle.replace(/^IdCodigoEspecial.*?\.\s*/i, '').trim();
  }

  ///////////////////////////xml////////////////////////////
  private generarXml(
      idCabLiquidacion: number,
      evt?: CellClickedEvent<ListadoAsientoContableResponse>
    ): void {
      if (!idCabLiquidacion || idCabLiquidacion <= 0) return;
      if (this.loading) return;

      this.loading = true;

      this.liquidacionCompraService
        .generarXml(idCabLiquidacion, true) // siempre true
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (resp: any) => {
            const ok = !!(resp?.success ?? resp?.Success);
            const msg =
              resp?.message ??
              resp?.Message ??
              (ok ? 'XML generado correctamente.' : 'No se pudo generar el XML.');

            if (!ok) {
              this.mostrarMensaje({
                type: 'error',
                title: 'XML',
                message: String(msg),
                showCancel: false,
                confirmText: 'Aceptar',
              });
              return;
            }

            // Marcar como enviado en la fila y refrescar UI
            if (evt?.node?.data) {
              (evt.node.data as any).enviado = true;

              this.gridApi?.refreshCells({
                rowNodes: [evt.node],
                columns: ['enviado', 'acciones'],
                force: true,
              });
            } else {
              this.obtenerAsientos();
            }

            // IMPORTANTE: al ACEPTAR el mensaje, descargar PDF automáticamente
            this.mostrarMensaje({
              type: 'success',
              title: 'XML generado',
              message: String(msg),
              showCancel: false,
              confirmText: 'Aceptar',
            })
            .afterClosed()
            .subscribe(() => {
              // Evita choque si algo dejó loading=true por error
              if (this.loading) return;

              //cambio generar pdf
              // ✅ genera/descarga el PDF inmediatamente tras aceptar
              //this.descargarPdf(idCabLiquidacion);
              const documentoSri = String(
                (evt?.data as any)?.documentoSri ??
                (evt?.node?.data as any)?.documentoSri ??
                ''
              ).trim();

              // ✅ genera/descarga el PDF inmediatamente tras aceptar
              this.descargarPdf(idCabLiquidacion, documentoSri);

            });
          },
          error: (err) => {
            console.error('generarXml error:', err);

            const msg =
              err?.error?.message ??
              err?.error?.Message ??
              err?.message ??
              'Error inesperado al generar el XML.';

            this.mostrarMensaje({
              type: 'error',
              title: 'Error',
              message: String(msg),
              showCancel: false,
              confirmText: 'Aceptar',
            });
          },
        });
    }

    private descargarPdf(idCabLiquidacion: number, documentoSri?: string): void {
      if (!idCabLiquidacion || idCabLiquidacion <= 0) return;
      if (this.loading) return;

      this.loading = true;

      this.liquidacionCompraService
        .descargarPdf(idCabLiquidacion)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (r) => {
            const blob = r?.blob;

            if (!blob || !(blob instanceof Blob) || blob.size === 0) {
              this.mostrarMensaje({
                type: 'warning',
                title: 'PDF',
                message: 'El PDF no contiene datos o no pudo descargarse.',
                showCancel: false,
                confirmText: 'Aceptar',
              });
              return;
            }

            // ✅ Nombre basado en documentoSri del AG-Grid
            const doc = String(documentoSri ?? '').trim();
            const safe = doc
              ? doc.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
              : '';

            const fileName = safe ? `LIQ-${safe}.pdf` : `LIQ-${idCabLiquidacion}.pdf`;

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          },
          error: (err) => {
            const msg =
              err?.error?.message ??
              err?.error?.Message ??
              err?.message ??
              'Error inesperado al descargar el PDF.';

            this.mostrarMensaje({
              type: 'error',
              title: 'Error',
              message: String(msg),
              showCancel: false,
              confirmText: 'Aceptar',
            });
          },
        });
    }

    

  ///añadir mas metodos aqui
}

/* ================== Helpers ================== */

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${day}-${m}-${y}`;
}

function blockComma(params: any): boolean { return params.event?.key === ','; }

const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;
function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;

  const field = params.colDef.field!;
  (params.data as any)[field] = n > 0 ? Number(n.toFixed(2)) : 0;
  return true;
}

function twoDecimalsDotFormatter(p: any): string {
  const val = Number(p.value ?? 0);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const normalized = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

function haberEditable(params: any) {
  const d = toNumber(params.data?.debe);
  return d <= 0;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeEnviado(v: any): boolean | null {
  if (v === true || v === 1 || v === '1' || v === 'true' || v === 'TRUE') return true;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === 'FALSE') return false;
  return null;
}