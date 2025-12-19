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
  AllCommunityModule
} from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import { ListadoAsientoContableResponse } from 'src/app/interfaces/responses/asientos-contables-response';
import { AsientosContablesFormComponent } from '../asientos-contables-form/asientos-contables-form.component';
//para imprimir el pdf
import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { UsuarioService } from 'src/app/services/usuario.service';

// Exportación
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AsientoContableResponse } from '../../../../../interfaces/responses/asiento-contable-response';
import {
  CustomMessageBoxComponent,
  MessageBoxData,
} from 'src/app/util/messages/custom-message-box.component';



ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-asientos-contables-ag',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MatSnackBarModule],
  templateUrl: './asientos-contables-list.component.html',
  styleUrls: ['./asientos-contables-list.component.css']
})
export class AsientoContableComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  loading = false;
  error: string | null = null;

   ////impresion////
  usuarioActual = this.usuarioService.getUsuarioActual();
  nombreusuario = this.usuarioActual?.nombre_usuario ?? '';
  ////

  gridOptions: GridOptions<ListadoAsientoContableResponse> = {
    rowHeight: 28,
    headerHeight: 35,
    suppressLoadingOverlay: true,
    suppressNoRowsOverlay: true
  };

  rowData: ListadoAsientoContableResponse[] = [];

  searchTerm = '';
  fechaDesde: string | null = null; // formato input type="date": yyyy-MM-dd
  fechaHasta: string | null = null;

  private gridApi!: GridApi<ListadoAsientoContableResponse>;

  columnDefs: ColDef<ListadoAsientoContableResponse>[] = [
    { headerName: 'Modulo', field: 'modulo', width: 100, sortable: true, filter: true, hide: true },
    { headerName: 'Código', field: 'idCabMaestro', width: 160, sortable: true, filter: true, hide: true },
    { headerName: 'Empresa', field: 'empresa', width: 160, sortable: true, filter: true, hide: true },

    {
      headerName: 'Fecha Transacción',
      field: 'fechatransaccion',
      width: 160,
      sortable: true,
      filter: true,
      valueGetter: p => p.data?.fechatransaccion ? new Date(p.data.fechatransaccion as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    {
      headerName: 'Fecha Ingreso',
      field: 'fechaingreso',
      width: 160,
      sortable: true,
      filter: true,
      valueGetter: p => p.data?.fechaingreso ? new Date(p.data.fechaingreso as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    { headerName: 'Tipo Asiento', field: 'tipoAsientoCompleto', width: 100, sortable: true, filter: true },
    { headerName: 'No. Documento', field: 'numdoc', width: 140, sortable: true, filter: true },
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
    { headerName: 'Beneficiario', field: 'beneficiario', width: 260, sortable: true, filter: true },
    { headerName: 'Observación', field: 'observacion', width: 300, sortable: true, filter: true },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 170,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      menuTabs: [],
      cellRenderer: () => `
        <button class="ag-action-btn" data-action="edit" title="Editar">
          <img src="assets/icons/icon-modificar-3.png" width="18" height="18" alt="Editar" />
        </button>
        <button class="btn-icon pdf"  data-action="print" title="Imprimir asiento">
            <img src="assets/icons/icon-imprimir.png" width="16" height="16" alt="PDF" />
        </button>
        <!--Copiar/Crear asiento estándar desde plantilla -->
        <button class="ag-action-btn" data-action="copy" title="Duplicación de asiento">
          <img src="assets/icons/icon-ficha-cliente.png" width="18" height="18" alt="Copiar" />
        </button>
        <button class="ag-action-btn danger" data-action="delete" title="Eliminar asiento">
          <img src="assets/icons/eliminar-as.png" width="18" height="18" />
        </button>
      `,
      sortable: false,
      filter: false
    }
  ];

  defaultColDef: ColDef = { resizable: true };

  constructor(
    private asientosService: AsientosContablesService,
    private dialog: MatDialog,
    private usuarioService: UsuarioService,   // ⬅nuevo usuario
    private snackBar: MatSnackBar              // ⬅nuevo nesajes
  ) {}

  ngOnInit(): void {
    this.setFechasMesActual();
    this.obtenerAsientos();
  }

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api as GridApi<ListadoAsientoContableResponse>;
  }

  obtenerAsientos(): void {
    this.loading = true;
    this.error = null;

    if (!this.fechaDesde || !this.fechaHasta) {
      this.loading = false;
      this.rowData = [];
      return;
    }

    this.asientosService.GetListado(this.fechaDesde, this.fechaHasta).subscribe({
      next: (resp: ListadoAsientoContableResponse[]) => {
        this.rowData = resp ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener asientos:', err);
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

    
    if (evt?.colDef?.colId !== 'acciones') {
      return;
    }

    const button = (evt.event?.target as HTMLElement)?.closest('button');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-action');

    if (action === 'edit' && evt.data) {
      this.editarAsiento(evt.data);
      return;
    }

    if (action === 'copy' && evt.data) {
      const id = Number(evt.data.idCabMaestro || 0);
      this.crearAsientoEstandar(id);
      return;
    }

    if (action === 'print' && evt.data) {
      const idCab = Number(evt.data.idCabMaestro || 0);
      this.imprimirAsiento(idCab);
      return;
    }

    if (action === 'delete') {
      if (!evt.data) { return; } // ✅ evita el error: T | undefined
      this.confirmarEliminar(evt.data);
      return;
    }

  }

  nuevoAsiento(): void {
    console.log('Nuevo asiento');
    this.abrirCrear();
  }

  editarAsiento(row: ListadoAsientoContableResponse): void {
    console.log('Editar asiento', row);
    ///EDITAR ASIENTO
     const id = Number(
      (row as any).idCabMaestro ?? (row as any).IdCabMaestro ?? 0
    );

    if (!id || id <= 0) {
      console.warn('No se encontró idCabMaestro para la fila:', row);
      return;
    }

    const modulo = Number((row as any).modulo ?? 0);
    if (modulo === 1) {
       this.snackBar.open(
      'No se puede editar, Corresponde a una factura de proveedor.',
      'Cerrar',
      {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snackbar-error']   // clase de estilo personalizada
      }
    );
    return;
    }

    this.abrirEditar(id);
    ///
  }

  /**
 * Crea un NUEVO asiento copiando la estructura de uno existente
 * Solo permite editar: Beneficiario, Observación y Fecha de transacción
 */
  crearAsientoEstandar(idCabMaestro: number): void {
    if (!idCabMaestro || idCabMaestro <= 0) {
      console.warn('ID de asiento inválido');
      return;
    }

    this.loading = true;

    // 1️⃣ Obtener el asiento completo
    this.asientosService.getById(idCabMaestro).subscribe({
      next: (asientoOriginal) => {
        this.loading = false;

        // 2️⃣ Preparar plantilla (limpia campos editables)
        const plantilla = this.prepararPlantillaEstandar(asientoOriginal);

        // 3️⃣ Abrir formulario en modo "plantilla"
        const dialogRef = this.dialog.open(AsientosContablesFormComponent, {
          width: '75vw',
          maxWidth: '95vw',
          height: '90vh',
          panelClass: 'asiento-dialog',
          autoFocus: false,
          restoreFocus: false,
          data: {
            modo: 'plantilla',           //  Nuevo modo
            asientoPlantilla: plantilla  //  Datos pre-cargados
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.obtenerAsientos(); // Recargar listado
          }
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar asiento para copiar:', err);
        alert('No se pudo cargar el asiento. Intente nuevamente.');
      }
    });
  }
  /**
 * Prepara el asiento original para usarlo como plantilla
 * Limpia los campos que el usuario debe ingresar manualmente
 */
  private prepararPlantillaEstandar(asientoOriginal: AsientoContableResponse): AsientoContableResponse {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().substring(0, 10); // YYYY-MM-DD
    const horaHoy = hoy.toISOString(); // ISO completo

    return {
      ...asientoOriginal,

      // Campos que se resetean (usuario los editará)
      IdCabMaestro: 0,                    // Nuevo asiento
      numdoc: 0,                          // Se auto-generará
      beneficiario: '',                   // Usuario lo ingresará
      observacion: '',                    // Usuario lo ingresará (concepto)
      fechatransaccion: fechaHoy,         // Fecha actual (editable)
      fechaingreso: horaHoy,              // Fecha/hora actual

      //  Campo especial: marcar como transacción estándar
      modulo: 0,                          //  Transacción estándar

      //  Campos que se mantienen de la plantilla
      // idTipoAsiento, idZona, idEmpresa, tipdoc, etc. vienen en ...asientoOriginal

      //  Detalles/Líneas se copian COMPLETOS (cuentas, montos, todo)
      detalles: (asientoOriginal.detalles || []).map((detalle, index) => ({
        ...detalle,
        IdDetMaestro: 0,                  //  Nueva línea
        IdCabMaestro: 0,                  //  Se asignará al guardar
        numlinea: index + 1,              //  Re-numerar
        fechatransaccion: fechaHoy,       //  Actualizar fecha
        fechaingreso: horaHoy,            //  Actualizar fecha/hora
        beneficiario: '',                 //  Se tomará de la cabecera
        comentario: detalle.comentario || '',
        debe: 0,
        haber: 0,
      }))
    };
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(AsientosContablesFormComponent, {
      width: '75vw',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      data: {
        modo: 'nuevo'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerAsientos();
      }
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(AsientosContablesFormComponent, {
      //width: '900px',
      width: '75vw',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      data: {
        modo: 'editar',
        id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerAsientos();
      }
    });
  }
  ///eliminar
  /*
  confirmarEliminar(row: ListadoAsientoContableResponse): void {

    const idCabMaestro = Number(row.idCabMaestro ?? 0);
    const idEmpresa = Number(row.idEmpresa ?? 0);
    const idUsuario = Number(this.usuarioActual?.id_usuario ?? 0);

    if (!idCabMaestro || !idEmpresa || !idUsuario) {
      this.snackBar.open(
        'No se pudo obtener la información necesaria para eliminar el asiento.',
        'Cerrar',
        { duration: 4000, panelClass: ['snackbar-error'] }
      );
      return;
    }

    ///cambio caja de texto
    const numero = String((row as any).numdoc ?? '');

    ////
    const confirmacion = confirm(
      `¿Está seguro de eliminar el asiento N° ${row.numdoc}?\n\nEsta acción NO se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    this.loading = true;

    this.asientosService
      .eliminar(idCabMaestro, idEmpresa, idUsuario)
      .subscribe({
        next: resp => {
          this.loading = false;

          if (resp.type === 'DELETED') {
            this.snackBar.open(
              'Asiento eliminado correctamente.',
              'OK',
              { duration: 3000, panelClass: ['snackbar-success'] }
            );
            this.obtenerAsientos(); // refrescar grid
          } else {
            this.snackBar.open(
              resp.message || 'No se pudo eliminar el asiento.',
              'Cerrar',
              { duration: 4000, panelClass: ['snackbar-error'] }
            );
          }
        },
        error: err => {
          this.loading = false;
          console.error('Error al eliminar asiento:', err);
          this.snackBar.open(
            'Error inesperado al eliminar el asiento.',
            'Cerrar',
            { duration: 4000, panelClass: ['snackbar-error'] }
          );
        }
      });
  }
  */

  confirmarEliminar(row: ListadoAsientoContableResponse): void {
    const idCabMaestro = Number(row.idCabMaestro ?? 0);
    const idEmpresa = Number(row.idEmpresa ?? 0);
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
    const tipdoc = String((row as any).tipoAsientoCompleto ?? '');

    // ✅ Reemplaza confirm() por tu MessageBox (gráfico 1)
    this.mostrarMensaje({
      type: 'warning', // o 'error' si quieres que se vea más fuerte
      title: 'Confirmación',
      message: `¿Está seguro de eliminar el asiento ?${tipdoc}-${numero}\n\n Esta acción NO se puede deshacer.`,
      showCancel: true,
      confirmText: 'Sí, eliminar',
      cancelText: 'No'
    })
    .afterClosed()
    .subscribe((confirmado: boolean) => {
      if (!confirmado) return;

      this.loading = true;

      this.asientosService.eliminar(idCabMaestro, idEmpresa, idUsuario).subscribe({
        next: resp => {
          this.loading = false;

          if (resp.type === 'DELETED') {
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
              message: resp.message || 'No se pudo eliminar el asiento.',
              showCancel: false,
              confirmText: 'Aceptar'
            });
          }
        },
        error: err => {
          this.loading = false;
          console.error('Error al eliminar asiento:', err);

          this.mostrarMensaje({
            type: 'error',
            title: 'Error',
            message: 'Error inesperado al eliminar el asiento.',
            showCancel: false,
            confirmText: 'Aceptar'
          });
        }
      });
    });
  }
  ////

  private setFechasMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth(); // 0 = enero

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);

    this.fechaDesde = toInputDate(primerDia);
    this.fechaHasta = toInputDate(ultimoDia);
  }

  /* ================== CABECERA PARA REPORTES ================== */

  private getCabeceraTexto(): { titulo: string; lineas: string[] } {
    const formatoFechaInput = (f: string | null) => {
      if (!f) { return ''; }              // viene como yyyy-MM-dd
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };

    const titulo = 'Listado Asientos Contables';

    const lineas: string[] = [
      `Rango de fechas: ${formatoFechaInput(this.fechaDesde)} al ${formatoFechaInput(this.fechaHasta)}`,
      this.searchTerm ? `Filtro de búsqueda: ${this.searchTerm}` : ''
    ].filter(x => !!x);

    return { titulo, lineas };
  }

  /* ================== EXPORTAR EXCEL (XLSX) ================== */

  onExportExcel(): void {
    if (!this.gridApi) { return; }

    const cab = this.getCabeceraTexto();
    const fechaStr = new Date().toISOString().slice(0, 10);

    const data: any[][] = [];

    // 1) Cabecera
    data.push([cab.titulo]);
    cab.lineas.forEach(l => data.push([l]));
    data.push([]);

    // columnas visibles sin Acciones
    const visibleCols = this.columnDefs.filter(
      c => !c.hide && c.colId !== 'acciones'
    );
    const headerRow = visibleCols.map(c => c.headerName || c.field);
    data.push(headerRow);

    const headerRowIndex = cab.lineas.length + 2;  // fila encabezados
    const firstDataRowIndex = headerRowIndex + 1;  // primera fila de datos

    // 2) Detalle (grid respetando filtros y orden) + totales
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

    // 3) Fila de totales
    const totalsRow = visibleCols.map(col => {
      switch (col.field) {
        case 'numdoc':
          return 'TOTALES:';
        case 'totdebe':
          return totalDebe;
        case 'tothaber':
          return totalHaber;
        case 'observacion':
          return `Saldo: ${saldo.toFixed(2)}`;
        default:
          return '';
      }
    });
    data.push(totalsRow);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    const totalCols = visibleCols.length;
    const merges: XLSX.Range[] = [];

    // Merge título
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
    // Merge líneas de cabecera
    cab.lineas.forEach((_, index) => {
      merges.push({
        s: { r: 1 + index, c: 0 },
        e: { r: 1 + index, c: totalCols - 1 }
      });
    });

    ws['!merges'] = merges;

    // 4) Anchos de columna
    ws['!cols'] = visibleCols.map(col => {
      let wch = 14;
      if (col.field === 'fechatransaccion' || col.field === 'fechaingreso') { wch = 16; }
      if (col.field === 'beneficiario') { wch = 28; }
      if (col.field === 'observacion') { wch = 40; }
      if (col.field === 'tipoAsientoCompleto') { wch = 18; }
      if (col.field === 'numdoc') { wch = 18; }
      return { wch };
    });

    // 5) Formato de celdas (fechas y montos)
    const ref = ws['!ref'] as string;
    let totalsRowIndex = data.length - 1;

    if (ref) {
      const range = XLSX.utils.decode_range(ref);

      for (let R = firstDataRowIndex; R <= range.e.r; ++R) {
        for (let C = 0; C < totalCols; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];
          if (!cell) continue;

          const fieldName = visibleCols[C].field;

          // Fechas
          if (fieldName === 'fechatransaccion' || fieldName === 'fechaingreso') {
            if (cell.v) {
              const dt = new Date(cell.v);
              const dd = dt.getDate().toString().padStart(2, '0');
              const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
              const yyyy = dt.getFullYear();
              cell.v = `${dd}/${mm}/${yyyy}`;
              cell.t = 's';
            }
          }

          // Montos
          if (fieldName === 'totdebe' || fieldName === 'tothaber') {
            if (cell.v != null && cell.v !== '') {
              const num = Number(cell.v);
              if (!isNaN(num)) {
                cell.v = num;
                cell.t = 'n';
                cell.z = '0.00';
              }
            }
          }
        }
      }
    }

    // 6) Estilos: título centrado y header azul
    const titleCellAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const titleCell = ws[titleCellAddr];
    if (titleCell) {
      (titleCell as any).s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Encabezados (fila headerRowIndex)
    for (let C = 0; C < totalCols; ++C) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      (cell as any).s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: '1D789F' }  // azul cabecera
        }
      };
    }

    // Fila de totales (última fila)
    for (let C = 0; C < totalCols; ++C) {
      const addr = XLSX.utils.encode_cell({ r: totalsRowIndex, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      (cell as any).s = {
        font: { bold: true },
        alignment: { horizontal: C >= 4 && C <= 5 ? 'right' : 'left' }
      };
    }

    // 7) Zebra rows + bordes finos en toda la tabla (encabezado, detalle y totales)
    if (ref) {
      const range = XLSX.utils.decode_range(ref);

      const borderStyle = {
        top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
        right:  { style: 'thin', color: { rgb: 'CCCCCC' } }
      };

      const stripe1 = 'FFFFFF';  // blanco
      const stripe2 = 'F5F5F5';  // gris muy claro

      for (let R = headerRowIndex; R <= totalsRowIndex; ++R) {
        for (let C = 0; C < totalCols; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (!cell) continue;

          const existing = (cell as any).s || {};

          // Bordes en todo
          existing.border = borderStyle;

          // Zebra solo para filas de detalle
          if (R >= firstDataRowIndex && R < totalsRowIndex) {
            const isEven = (R - firstDataRowIndex) % 2 === 0;
            existing.fill = {
              patternType: 'solid',
              fgColor: { rgb: isEven ? stripe1 : stripe2 }
            };
          }

          (cell as any).s = existing;
        }
      }
    }

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asientos');
    XLSX.writeFile(wb, `Listado_Asientos_${fechaStr}.xlsx`);
  }

  /* ================== EXPORTAR PDF (jsPDF + autoTable) ================== */

  onExportPdf(): void {
    if (!this.gridApi) { return; }

    const cab = this.getCabeceraTexto();
    const doc = new jsPDF('l', 'pt', 'a4'); // horizontal

    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(
      cab.titulo,
      doc.internal.pageSize.getWidth() / 2,
      40,
      { align: 'center' }
    );

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 60;
    cab.lineas.forEach(l => {
      doc.text(l, 40, y);
      y += 14;
    });

    // columnas sin Acciones
    const visibleCols = this.columnDefs.filter(
      c => !c.hide && c.colId !== 'acciones'
    );

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

        // Sumar totales
        const debe = Number(r.totdebe || 0);
        const haber = Number(r.tothaber || 0);
        if (!isNaN(debe)) totalDebe += debe;
        if (!isNaN(haber)) totalHaber += haber;

        // Formatear montos
        ['totdebe', 'tothaber'].forEach(f => {
          if (r[f] != null && r[f] !== '') {
            const num = Number(r[f]);
            if (!isNaN(num)) {
              r[f] = num.toFixed(2);
            }
          }
        });

        // Fechas dd/mm/yyyy
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
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [29, 120, 159],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        fechatransaccion:   { halign: 'center', cellWidth: 70 },
        fechaingreso:       { halign: 'center', cellWidth: 70 },
        tipoAsientoCompleto:{ halign: 'center', cellWidth: 70 },
        numdoc:             { halign: 'center', cellWidth: 70 },
        totdebe:            { halign: 'right',  cellWidth: 65 },
        tothaber:           { halign: 'right',  cellWidth: 65 },
        beneficiario:       { halign: 'left',   cellWidth: 140 },
        observacion:        { halign: 'left',   cellWidth: 220 }
      } as any,
      didDrawPage: () => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.text(
          str,
          doc.internal.pageSize.getWidth() - 60,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });

    // Totales debajo de la tabla
    const lastTable = (doc as any).lastAutoTable;
    const finalY = lastTable ? lastTable.finalY : (y + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Debe: ${totalDebe.toFixed(2)}`, 40, finalY + 20);
    doc.text(`Total Haber: ${totalHaber.toFixed(2)}`, 200, finalY + 20);
    doc.text(`Saldo: ${saldo.toFixed(2)}`, 360, finalY + 20);

    const fechaStr = new Date().toISOString().slice(0, 10);

    doc.output('dataurlnewwindow');
    doc.save(`Listado_Asientos_${fechaStr}.pdf`);
  }

  //impimir asiento
private imprimirAsiento(idCabMaestro: number): void {
  if (!idCabMaestro || idCabMaestro <= 0) {
    alert('No se encontró el identificador del asiento.');
    return;
  }

  this.loading = true;

  this.asientosService.getAsientoImpresion(idCabMaestro).subscribe({
    next: (asiento: AsientoImpresion) => {
      this.loading = false;

      if (!asiento) {
        alert('No se encontraron datos para la impresión del asiento.');
        return;
      }

      // con usuario:
      generarPdfAsiento(asiento, this.nombreusuario);

      // si no quieres usuario:
      // generarPdfAsiento(asiento);
    },
    error: (err) => {
      this.loading = false;
      console.error('Error al obtener asiento para impresión:', err);
      alert('Ocurrió un error al preparar la impresión del asiento.');
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

  //

  //

}

/* ================== Helpers ================== */

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${day}-${m}-${y}`;
}

function numberParser(params: any): number {
  const v = (params.newValue ?? '').toString().replace(',', '.').trim();
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function boolParser(params: any): boolean {
  const v = (params.newValue ?? '').toString().toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sí' || v === 'si';
}
function isoParser(params: any): string {
  const v = (params.newValue ?? '').toString().trim();
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString();
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
  if (field === 'debe') {
    (params.data as any).debe = n > 0 ? Number(n.toFixed(2)) : 0;
    if ((params.data as any).debe > 0) (params.data as any).haber = 0;
  } else if (field === 'haber') {
    (params.data as any).haber = n > 0 ? Number(n.toFixed(2)) : 0;
    if ((params.data as any).haber > 0) (params.data as any).debe = 0;
  } else {
    (params.data as any)[field] = n;
  }
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

function debeEditable(params: any) {
  const h = toNumber(params.data?.haber);
  return h <= 0;
}
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
