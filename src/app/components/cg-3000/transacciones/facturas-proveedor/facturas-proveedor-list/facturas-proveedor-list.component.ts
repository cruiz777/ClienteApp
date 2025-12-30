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
import { FacturasProveedorFormComponent } from '../facturas-proveedor-form/facturas-proveedor-form.component';
import { ListadoAsientoContableResponse } from 'src/app/interfaces/responses/asientos-contables-response';
import { FacturasProveedorService } from 'src/app/services/facturas-proveedor.service';

import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { UsuarioService } from 'src/app/services/usuario.service';
import { RetencionesFormComponent } from '../../retenciones/retenciones-form/retenciones-form.component';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AsientoContableResponse } from 'src/app/interfaces/responses/asiento-contable-response';
import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';

import { MotivoNoAnulacionAsientoResponse } from 'src/app/interfaces/responses/MotivoNoAnulacionAsientoResponse ';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-facturas-proveedor-ag',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MatDialogModule],
  templateUrl: './facturas-proveedor-list.component.html',
  styleUrls: ['./facturas-proveedor-list.component.css']
})
export class FacturasProveedorComponent implements OnInit {
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
    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 205,
      resizable: false,
      suppressSizeToFit: true, // ya lo tenías bien
      pinned: 'right',
      suppressHeaderMenuButton: true,
      menuTabs: [],
      cellRenderer: () => `
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
      `,
      sortable: false,
      filter: false
    }
  ];

  constructor(
    private facturasService: FacturasProveedorService,
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

    this.facturasService.GetListado(this.fechaDesde, this.fechaHasta).subscribe({
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
    if (action === 'copy' && evt.data) {
      const id = Number(evt.data.idCabMaestro || 0);
      this.crearFacturaEstandar(id);
      return;
    }
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
      this.confirmarEliminar(evt.data);
      return;
    }
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
              this.dialog.open(FacturasProveedorFormComponent, {
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
    const dialogRef = this.dialog.open(FacturasProveedorFormComponent, {
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
    const dialogRef = this.dialog.open(FacturasProveedorFormComponent, {
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

    const titulo = 'Listado Facturas Proveedor';

    const lineas: string[] = [
      `Rango de fechas: ${formatoFechaInput(this.fechaDesde)} al ${formatoFechaInput(this.fechaHasta)}`,
      this.searchTerm ? `Filtro de búsqueda: ${this.searchTerm}` : ''
    ].filter(x => !!x);

    return { titulo, lineas };
  }

  /* ========== EXPORTAR EXCEL ========== */

  onExportExcel(): void {
    if (!this.gridApi) { return; }

    const cab = this.getCabeceraTexto();
    const fechaStr = new Date().toISOString().slice(0, 10);

    const data: any[][] = [];
    data.push([cab.titulo]);
    cab.lineas.forEach(l => data.push([l]));
    data.push([]);

    const visibleCols = this.columnDefs.filter(c => !c.hide && c.colId !== 'acciones');
    const headerRow = visibleCols.map(c => c.headerName || c.field);
    data.push(headerRow);

    let totalDebe = 0;
    let totalHaber = 0;

    this.gridApi.forEachNodeAfterFilterAndSort(node => {
      if (node.data) {
        const row = visibleCols.map(c => (node.data as any)[c.field as string]);
        data.push(row);

        const debe = Number((node.data as any).totdebe || 0);
        const haber = Number((node.data as any).tothaber || 0);
        if (!isNaN(debe)) totalDebe += debe;
        if (!isNaN(haber)) totalHaber += haber;
      }
    });

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
    data.push(totalsRow);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = visibleCols.map(col => {
      let wch = 14;
      if (col.field === 'fechatransaccion' || col.field === 'fechaingreso') { wch = 16; }
      if (col.field === 'beneficiario') { wch = 28; }
      if (col.field === 'observacion') { wch = 40; }
      if (col.field === 'tipoAsientoCompleto') { wch = 18; }
      if (col.field === 'numdoc') { wch = 18; }
      return { wch };
    });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `Listado_FacturasProveedor_${fechaStr}.xlsx`);
  }

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
    doc.save(`Listado_FacturasProveedor_${fechaStr}.pdf`);
  }

  crearFacturaEstandar(idCabMaestro: number): void {
    if (!idCabMaestro || idCabMaestro <= 0) {
      console.warn('ID de factura inválido');
      return;
    }

    this.loading = true;

    this.facturasService.getById(idCabMaestro).subscribe({
      next: (facturaOriginal) => {
        this.loading = false;

        const plantilla = this.prepararPlantillaEstandar(facturaOriginal);

        const dialogRef = this.dialog.open(FacturasProveedorFormComponent, {
          width: '75vw',
          maxWidth: '95vw',
          height: '90vh',
          panelClass: 'asiento-dialog',
          autoFocus: false,
          restoreFocus: false,
          disableClose: true,
          data: { modo: 'plantilla', facturaPlantilla: plantilla }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) this.obtenerAsientos();
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar factura para duplicar:', err);
        alert('No se pudo cargar la factura. Intente nuevamente.');
      }
    });
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

    this.facturasService.getAsientoImpresion(idCabMaestro).subscribe({
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
