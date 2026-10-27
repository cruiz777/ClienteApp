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
import { finalize } from 'rxjs/operators';
//para imprimir el pdf
import { generarPdfAsiento } from '../../util/asiento-pdf.util';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { UsuarioService } from 'src/app/services/usuario.service';

import { MotivoNoAnulacionAsientoResponse } from 'src/app/interfaces/responses/MotivoNoAnulacionAsientoResponse ';

// Exportación
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
//import * as XLSX from 'xlsx';
import * as XLSX from 'xlsx-js-style';
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
          <img src="assets/icons/icon-basurero.png" width="18" height="18" />
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
   
    /*
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
    */
    ///nuevo proceso
  
  const id = Number((row as any).idCabMaestro ?? (row as any).IdCabMaestro ?? 0);
  if (!id || id <= 0) return;

  const modulo = Number((row as any).modulo ?? 0);
  if (modulo === 1) {
    this.snackBar.open(
      'No se puede editar, Corresponde a una factura de proveedor.',
      'Cerrar',
      { duration: 4000, horizontalPosition: 'right', verticalPosition: 'top', panelClass: ['snackbar-error'] }
    );
    return;
  }

  const idEmpresa = Number((row as any).idEmpresa ?? (row as any).IdEmpresa ?? 0);
  const tipoDoc = String((row as any).tipoAsientoCompleto ?? '').trim(); // si tienes tipdoc real, úsalo mejor

  /*
  if (!idEmpresa || !tipoDoc) {
    // Si no puedes validar por falta de datos, abre normal
    this.abrirEditar(id);
    return;
  }
  */

  this.loading = true;

  this.asientosService.validarAnulacion(id, idEmpresa, tipoDoc)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (resp) => {
        const data = resp?.data;

        // Si no hay data, abre normal
        if (!data) {
          this.abrirEditar(id);
          return;
        }
        /*
        // Si NO puede modificar => abrir solo lectura
        if (data.puedeAnular === false) {
          const motivosTxt = this.formatearMotivosValidacion(data.motivos ?? []);
          const encabezado = `Asiento: ${tipoDoc}-${String((row as any).numdoc ?? '')}`;
          const msgFinal =
            `${encabezado}\nNo se puede modificar.\n\n` +
            (motivosTxt || 'Revise los motivos.');

          this.dialog.open(AsientosContablesFormComponent, {
            width: '75vw',
            maxWidth: '95vw',
            height: '90vh',
            panelClass: 'asiento-dialog',
            autoFocus: false,
            restoreFocus: false,
            data: {
              modo: 'editar',
              id,
              soloLectura: true,
              motivoSoloLectura: msgFinal
            }
          });

          return;
        }
        */

        if (data.puedeAnular === false) {
          const motivosTxt = this.formatearMotivosValidacion(data.motivos ?? []);
          const encabezado = `Asiento: ${tipoDoc}-${String((row as any).numdoc ?? '')}`;
          const msgFinal =
            `${encabezado}\nNo se puede modificar.\n\n` +
            (motivosTxt || 'Revise los motivos.');

          // 1) Primero mostrar el mensaje del backend
          this.mostrarMensaje({
            type: 'error',
            title: 'No se puede modificar',
            message: msgFinal,
            showCancel: false,
            confirmText: 'Aceptar',
          })
          .afterClosed()
          .subscribe(() => {
            // 2) Luego abrir el formulario en modo lectura
            this.dialog.open(AsientosContablesFormComponent, {
              width: '75vw',
              maxWidth: '95vw',
              height: '90vh',
              panelClass: 'asiento-dialog',
              autoFocus: false,
              restoreFocus: false,
              data: {
                modo: 'editar',
                id,
                soloLectura: true,
                // Si quieres conservar el detalle pero NO mostrarlo en UI:
                motivoSoloLectura: msgFinal
              }
            });
          });

          return;
        }

        // Si SI puede modificar => abrir edición normal
        this.abrirEditar(id);
      },
      error: () => {
        // Si falla validación, abre normal (o si prefieres, bloquea)
        //this.abrirEditar(id);
      }
    });

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
  private prepararPlantillaEstandar(
    asientoOriginal: AsientoContableResponse
  ): AsientoContableResponse {
    const ahora = new Date();

    // Usar fecha LOCAL, no toISOString() para evitar corrimientos por UTC.
    const fechaHoy = toInputDate(ahora);               // yyyy-MM-dd local
    const fechaIngresoActual = toLocalDateTime(ahora); // yyyy-MM-ddTHH:mm:ss local

    return {
      ...asientoOriginal,

      // Nuevo asiento
      IdCabMaestro: 0,
      numdoc: 0,

      // Campos que el usuario ingresará nuevamente
      beneficiario: '',
      observacion: '',

      // Valores iniciales. La fecha de transacción definitiva será la
      // que el usuario seleccione y guardar() la impondrá también
      // en TODOS los detalles.
      fechatransaccion: fechaHoy,
      fechaingreso: fechaIngresoActual,

      // cargarPlantilla() lo establecerá en 5
      modulo: 0,

      // Copiar estructura como NUEVAS líneas
      detalles: (asientoOriginal.detalles || []).map((detalle, index) => ({
        ...detalle,
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: index + 1,

        // Valores iniciales; guardar() los vuelve a sincronizar
        // con la cabecera justo antes de enviar al backend.
        fechatransaccion: fechaHoy,
        fechaingreso: fechaIngresoActual,

        beneficiario: '',
        comentario: detalle.comentario || '',

        // Se mantiene el comportamiento original de la duplicación
        debe: 0,
        haber: 0,

        estadoIngreso: true,
        transferido: false,
        fechatransferido: '',
        idPorIva: null,
        porcentaje: null,
      })),
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
  */
  /////eliminar asiento

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

  // Número para mostrar
  const numero = String((row as any).numdoc ?? '');

  // TipoDoc real: ideal que venga del backend como "tipdoc".
  // Si no existe, lo derivamos desde tipoAsientoCompleto.
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

  // 1) VALIDAR primero (backend)
  this.asientosService.validarAnulacion(idCabMaestro, idEmpresa, tipoDoc)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (resp) => {
        const data = resp?.data;

        // Si el API por alguna razón devolviera data null
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

        // 2) Si NO puede anular => mostrar motivos y salir
        if (data.puedeAnular === false) {
          const numero = String((row as any).numdoc ?? '');
          const tipoDoc = String((row as any).tipoAsientoCompleto ?? '');
          const encabezado = `Asiento: ${tipoDoc}-${numero}`;

          const motivosTxt = this.formatearMotivosValidacion(data.motivos ?? []);

          const msgFinal =
            `${encabezado}\n` +
            `No se puede eliminar/modificar.\n\n` +
            (motivosTxt || 'Revise los motivos.');

          /*
          const msgFinal =
            (resp?.message ? `${resp.message}\n\n` : '') +
            (motivosTxt ? motivosTxt : 'El asiento no puede eliminarse/modificarse por reglas de validación.');
          */

          this.mostrarMensaje({
            type: 'error',
            title: 'No se puede eliminar',
            message: msgFinal,
            showCancel: false,
            confirmText: 'Aceptar'
          });

          return;
        }

        // 3) Si SÍ puede anular => confirmar con modal
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

          // 4) Eliminar
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
    XLSX.writeFile(wb, `Listado_FacturasProveedor_${fechaStr}.xlsx`);
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

  formatearMotivosValidacion(motivos: MotivoNoAnulacionAsientoResponse[]): string {
    /*
    if (!motivos || motivos.length === 0) return '';

    return motivos
      .map(m =>
        `• ${m.codigo}: ${m.mensaje}${m.detalle ? `\n  ${m.detalle}` : ''}`
      )
      .join('\n\n');
    */
   if (!motivos || motivos.length === 0) return '';

      return motivos.map(m => {
        const codigo = String(m.codigo ?? '').toUpperCase();
        const mensaje = String(m.mensaje ?? '').trim();
        const detalle = String(m.detalle ?? '').trim();

        // EG: banco -> solo cuenta y nombre (sin prefijos, sin códigos)
        if (codigo === 'EG_TIENE_CUENTA_BANCO') {
          // Si backend ya manda limpio, esto solo lo presenta.
          // Si backend aún manda "CodCont..., Plan..., Cuenta..., Nombre..."
          // intentamos extraer Cuenta y Nombre:
          const cuentaNombre = this.extraerCuentaNombreBanco(detalle);
          return `Motivo: ${mensaje}\nCuenta banco: ${cuentaNombre || detalle}`;
        }

        // Conciliado -> no mostrar detalle técnico
        if (codigo === 'ASIENTO_CONCILIADO') {
          return `Motivo: ${mensaje}`;
        }

        // Otros -> solo mensaje (y si detalle es corto y útil, lo añades)
        return `Motivo: ${mensaje}`;
      }).join('\n\n');

  }

  private extraerCuentaNombreBanco(detalle: string): string {
    if (!detalle) return '';

    // Caso 1 (tu formato anterior): "... Cuenta:110102-001, Nombre:BANCO PRODUBANCO"
    const cuentaMatch = detalle.match(/Cuenta\s*:\s*([^,|]+)/i);
    const nombreMatch = detalle.match(/Nombre\s*:\s*([^|]+)/i);

    const cuenta = cuentaMatch?.[1]?.trim() ?? '';
    const nombre = nombreMatch?.[1]?.trim() ?? '';

    if (cuenta && nombre) return `${cuenta} - ${nombre}`;

    // Caso 2 (nuevo backend limpio): "110102-001 - BANCO PRODUBANCO"
    return detalle.replace(/^IdCodigoEspecial.*?\.\s*/i, '').trim();
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

function toLocalDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mi}:${ss}`;
}