import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService } from 'src/app/services/cliente.service';
import { ExportOptionsG, ExportService } from 'src/app/services/export.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { MatDialog } from '@angular/material/dialog';
import { DialogProcesoComponent } from '../dialog-proceso/dialog-proceso.component';
import { UsuarioService } from 'src/app/services/usuario.service';

import {
  AuditoriaClientesComponent
} from './auditoria-clientes/auditoria-clientes.component';


interface Cliente {
  clientes_codigo: number;
  nomcli: string;
  dircli: string;
  ruc: string;
  fecing: string | Date;
  zonaReferencia: string;
  estadoNombre: string;
  prefijo: string;

  representante?: string;
  telefono?: string;
  tipoCliente?: string;
  grupoEmpresa?: string;

  nPrefijo?: number;

  checkPrefijo?: boolean;
  checkGuia?: boolean;
  checkOtros?: boolean;
}


@Component({
  selector: 'app-explorador',
  templateUrl: './explorador.component.html',
  styleUrls: ['./explorador.component.css']
})
export class ExploradorComponent implements OnInit {

  @ViewChild(AgGridAngular)
  agGrid?: AgGridAngular;


  filtroForm!: FormGroup;


  pageSize = 10;

  totalRegistros = 0;


  clientesFiltrados: Cliente[] = [];

  rowData: Cliente[] = [];


  logoUrl = '';


  private gridApi?: GridApi;


  // =========================================================
  // USUARIO ACTUAL
  // =========================================================

  usuarioActual =
    this.usuarioService.getUsuarioActual();


  // =========================================================
  // DEFAULT COLUMN
  // =========================================================

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };


  // =========================================================
  // COLUMNAS
  // =========================================================

  columnDefs: ColDef[] = [

    {
      headerName: 'Código',
      field: 'clientes_codigo',
      width: 100
    },

    {
      headerName: 'Nombre',
      field: 'nomcli',
      width: 280
    },

    {
      headerName: 'Dirección',
      field: 'dircli',
      width: 280
    },

    {
      headerName: 'RUC',
      field: 'ruc',
      width: 180
    },

    {
      headerName: 'T.CLIENTE',
      field: 'tipoCliente',
      width: 120
    },

    {
      headerName: 'G.EMPRESA',
      field: 'grupoEmpresa',
      width: 120
    },

    {
      headerName: 'F.Ingreso',
      field: 'fecing',
      width: 130,
      filter: 'agDateColumnFilter',

      valueGetter: (p) => {

        const v =
          p.data?.fecing;

        if (
          !v ||
          v === '0001-01-01T00:00:00'
        ) {
          return null;
        }

        const d =
          new Date(v);

        return isNaN(d.getTime())
          ? null
          : d;
      },

      valueFormatter: (p) =>
        this.formatearFecha(
          p.value
        ),

      filterParams: {

        comparator:
          (
            filterDate: Date,
            cellValue: any
          ) => {

            if (
              !cellValue
            ) {
              return -1;
            }

            const cellDate =
              cellValue instanceof Date
                ? cellValue
                : new Date(cellValue);

            if (
              isNaN(
                cellDate.getTime()
              )
            ) {
              return -1;
            }

            const cellMid =
              new Date(
                cellDate.getFullYear(),
                cellDate.getMonth(),
                cellDate.getDate()
              );

            const filterMid =
              new Date(
                filterDate.getFullYear(),
                filterDate.getMonth(),
                filterDate.getDate()
              );

            if (
              cellMid <
              filterMid
            ) {
              return -1;
            }

            if (
              cellMid >
              filterMid
            ) {
              return 1;
            }

            return 0;
          },

        browserDatePicker:
          true
      }
    },

    {
      headerName: 'Zona',
      field: 'zonaReferencia',
      width: 100
    },

    {
      headerName: 'Estado',
      field: 'estadoNombre',
      width: 100
    },

    {
      headerName: 'Prefijo',
      field: 'prefijo',
      width: 100
    },

    {
      headerName: 'Representante',
      field: 'representante',
      width: 140
    },

    {
      headerName: 'Teléfono',
      field: 'telefono',
      width: 150,

      valueFormatter:
        params =>
          params.value
            ? `+593${params.value}`
            : ''
    },


    // =======================================================
    // NÚMERO PREFIJO
    // =======================================================

    {
      headerName: '# Prefijo',
      field: 'nPrefijo',

      width: 105,
      minWidth: 105,
      maxWidth: 105,

      pinned: 'right',

      lockPinned: true,

      editable: false,

      filter: true,

      headerClass:
        'header-n-prefijo',

      cellClass:
        'cell-n-prefijo'
    },


    // =======================================================
    // CHECK PREFIJO
    // =======================================================

    {
      headerName: 'Prefijo',

      field: 'checkPrefijo',

      width: 95,
      minWidth: 95,
      maxWidth: 95,

      pinned: 'right',

      lockPinned: true,

      sortable: false,

      filter: true,

      resizable: false,

      headerClass:
        'header-check-prefijo',

      cellClass:
        'cell-check-prefijo',

      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },

      cellRenderer:
        this.crearCheckboxRenderer(
          'checkPrefijo'
        )
    },


    // =======================================================
    // CHECK ORDEN COMPRA
    // =======================================================

    {
      headerName: 'O.Compra',

      field: 'checkGuia',

      width: 95,
      minWidth: 95,
      maxWidth: 95,

      pinned: 'right',

      lockPinned: true,

      sortable: false,

      filter: true,

      resizable: false,

      headerClass:
        'header-check-guia',

      cellClass:
        'cell-check-guia',

      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },

      cellRenderer:
        this.crearCheckboxRenderer(
          'checkGuia'
        )
    },


    // =======================================================
    // CHECK OTROS
    // =======================================================

    {
      headerName: 'Otros',

      field: 'checkOtros',

      width: 95,
      minWidth: 95,
      maxWidth: 95,

      pinned: 'right',

      lockPinned: true,

      sortable: false,

      filter: true,

      resizable: false,

      headerClass:
        'header-check-otros',

      cellClass:
        'cell-check-otros',

      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },

      cellRenderer:
        this.crearCheckboxRenderer(
          'checkOtros'
        )
    }

  ];


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private clienteService: ClienteService,
    private exportService: ExportService,
    public permissions: PermissionsService,
    private dialog: MatDialog,
    private usuarioService: UsuarioService
  ) {
  }


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.filtroForm =
      this.fb.group({
        busquedaGeneral: [''],
        prefijoBusqueda: ['']
      });
  }


  // =========================================================
  // FILTROS
  // =========================================================

  private getFiltros(): {
    busquedaGeneral: string;
    prefijoBusqueda: string;
  } {

    return {

      busquedaGeneral:
        String(
          this.filtroForm
            .get(
              'busquedaGeneral'
            )
            ?.value ||
          ''
        )
          .trim(),

      prefijoBusqueda:
        String(
          this.filtroForm
            .get(
              'prefijoBusqueda'
            )
            ?.value ||
          ''
        )
          .trim()
    };
  }


  // =========================================================
  // GRID READY
  // =========================================================

  onGridReady(
    event:
      GridReadyEvent
  ): void {

    this.gridApi =
      event.api;

    this.cargarDatos(
      true
    );
  }


  // =========================================================
  // CARGAR DATOS
  // =========================================================

  cargarDatos(
    resetAPrimeraPagina:
      boolean =
      false
  ): void {

    const filtros =
      this.getFiltros();


    this.gridApi
      ?.showLoadingOverlay();


    this.clienteService
      .getClientesPaginados(
        1,
        40000,
        filtros
      )
      .subscribe({

        next:
          (res: any) => {

            this.rowData =
              (
                res.data ||
                []
              )
                .map(
                  (
                    x:
                      Cliente
                  ) => ({

                    ...x,

                    nPrefijo:
                      Number(
                        x.nPrefijo ??
                        0
                      ),

                    checkPrefijo:
                      this.toBool(
                        (x as any)
                          .checkPrefijo
                      ),

                    checkGuia:
                      this.toBool(
                        (x as any)
                          .checkGuia
                      ),

                    checkOtros:
                      this.toBool(
                        (x as any)
                          .checkOtros
                      )
                  })
                );


            this.totalRegistros =
              res.count ??
              this.rowData.length;


            this.clientesFiltrados =
              [
                ...this.rowData
              ];


            if (
              resetAPrimeraPagina
            ) {

              this.gridApi
                ?.paginationGoToFirstPage();
            }


            if (
              !this.rowData.length
            ) {

              this.gridApi
                ?.showNoRowsOverlay();

            }
            else {

              this.gridApi
                ?.hideOverlay();
            }
          },


        error:
          () => {

            this.rowData =
              [];


            this.totalRegistros =
              0;


            this.clientesFiltrados =
              [];


            this.gridApi
              ?.showNoRowsOverlay();


            this.mostrarAlerta(
              'Error cargando clientes',
              'Error'
            );
          }

      });
  }


  // =========================================================
  // APLICAR FILTROS
  // =========================================================

  aplicarFiltros():
    void {

    this.cargarDatos(
      true
    );
  }


  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  limpiarFiltros():
    void {

    this.filtroForm
      .reset();


    this.cargarDatos(
      true
    );
  }


  // =========================================================
  // PAGE SIZE
  // =========================================================

  onPageSizeInput(
    val:
      string |
      number
  ): void {

    const num =
      parseInt(
        String(val)
          .replace(
            /\D/g,
            ''
          ),
        10
      );


    this.pageSize =
      this.clampPageSize(
        isNaN(num)
          ? 10
          : num
      );


    this.gridApi
      ?.paginationGoToFirstPage();


    (
      this.gridApi as any
    )
      ?.refreshClientSideRowModel
      ?.(
        'paginate'
      );
  }


  normalizePageSize():
    void {

    if (
      !this.pageSize ||
      isNaN(
        Number(
          this.pageSize
        )
      )
    ) {

      this.pageSize =
        10;
    }


    this.pageSize =
      this.clampPageSize(
        Number(
          this.pageSize
        )
      );


    this.gridApi
      ?.paginationGoToFirstPage();


    (
      this.gridApi as any
    )
      ?.refreshClientSideRowModel
      ?.(
        'paginate'
      );
  }


  onlyDigits(
    ev:
      KeyboardEvent
  ): void {

    if (
      !/^\d$/.test(
        ev.key
      )
    ) {

      ev.preventDefault();
    }
  }


  private clampPageSize(
    n:
      number
  ): number {

    return Math.max(
      1,
      Math.min(
        1000,
        n
      )
    );
  }


  // =========================================================
  // ALERTA
  // =========================================================

  mostrarAlerta(
    mensaje:
      string,

    tipo:
      string
  ): void {

    this._snackBar
      .open(
        mensaje,
        tipo,
        {

          horizontalPosition:
            'end',

          verticalPosition:
            'top',

          duration:
            3000
        }
      );
  }


  // =========================================================
  // FECHA
  // =========================================================

  private formatearFecha(
    fecha:
      string |
      Date
  ): string {

    if (
      !fecha ||
      fecha ===
      '0001-01-01T00:00:00'
    ) {

      return '';
    }


    const d =
      new Date(
        fecha
      );


    return (
      `${String(d.getDate()).padStart(2, '0')}/` +
      `${String(d.getMonth() + 1).padStart(2, '0')}/` +
      `${d.getFullYear()}`
    );
  }


  // =========================================================
  // EXPORTAR
  // =========================================================

  async exportar(
    tipo:
      'excel' |
      'pdf'
  ): Promise<void> {

    if (
      !this.agGrid?.api
    ) {

      return;
    }


    const dataAll =
      this.rowData ||
      [];


    if (
      dataAll.length ===
      0
    ) {

      return;
    }


    const titulo =
      tipo ===
      'excel'

        ? 'Generando Reporte Excel Clientes'

        : 'Generando Reporte PDF Clientes';


    const ref =
      this.dialog
        .open(
          DialogProcesoComponent,
          {

            disableClose:
              true,

            autoFocus:
              false,

            panelClass:
              'dialog-proceso-panel',

            data: {

              titulo,

              subtitulo:
                `Total registros: ${dataAll.length}`,

              pasos: [

                'Obteniendo clientes del servidor...',

                'Procesando clientes...'
              ]
            }
          }
        );


    try {

      await new Promise<void>(
        r =>
          setTimeout(
            () =>
              r(),
            0
          )
      );


      // =====================================================
      // EXCEL
      // =====================================================

      const headersExcel = [

        'Código',

        'Nombre',

        'Dirección',

        'RUC',

        'T.CLIENTE',

        'G.EMPRESA',

        'F.Ingreso',

        'Zona',

        'Estado',

        'Prefijo',

        'Representante',

        'Teléfono',

        '# Prefijo',

        'Check Prefijo',

        'Check O.Compra',

        'Check Otros'
      ];


      const columnsExcel = [

        'clientes_codigo',

        'nomcli',

        'dircli',

        'ruc',

        'tipoCliente',

        'grupoEmpresa',

        'fecing',

        'zonaReferencia',

        'estadoNombre',

        'prefijo',

        'representante',

        'telefono',

        'nPrefijo',

        'checkPrefijo',

        'checkGuia',

        'checkOtros'
      ];


      const dataExcel =
        dataAll.map(
          r => ({

            clientes_codigo:
              r.clientes_codigo ??
              '',

            nomcli:
              r.nomcli ??
              '',

            dircli:
              r.dircli ??
              '',

            ruc:
              r.ruc ??
              '',

            tipoCliente:
              r.tipoCliente ??
              '',

            grupoEmpresa:
              r.grupoEmpresa ??
              '',

            fecing:
              r.fecing
                ? new Date(
                  r.fecing
                )
                : '',

            zonaReferencia:
              r.zonaReferencia ??
              '',

            estadoNombre:
              r.estadoNombre ??
              '',

            prefijo:
              r.prefijo ??
              '',

            representante:
              r.representante ??
              '',

            telefono:
              r.telefono
                ? `+593${r.telefono}`
                : '',

            nPrefijo:
              r.nPrefijo ??
              0,

            checkPrefijo:
              this.formatearCheckExport(
                r.checkPrefijo
              ),

            checkGuia:
              this.formatearCheckExport(
                r.checkGuia
              ),

            checkOtros:
              this.formatearCheckExport(
                r.checkOtros
              )
          })
        );


      const optionsExcel:
        ExportOptions = {

        data:
          dataExcel,

        columns:
          columnsExcel,

        headers:
          headersExcel,

        filename:
          'Clientes_TOTAL',

        title:
          `Clientes – Total (${dataExcel.length})`,

        logoUrl:
          this.logoUrl
      };


      // =====================================================
      // PDF
      // =====================================================

      const headersPdf = [

        'Cód',

        'Nombre',

        'RUC',

        'T.Cliente',

        'F.Ingr',

        'Estado',

        '# Pref',

        'Pref',

        'Guía',

        'Otros'
      ];


      const columnsPdf = [

        'clientes_codigo',

        'nomcli',

        'ruc',

        'tipoCliente',

        'fecing',

        'estadoNombre',

        'nPrefijo',

        'checkPrefijo',

        'checkGuia',

        'checkOtros'
      ];


      const dataPdf =
        dataAll.map(
          r => ({

            clientes_codigo:
              r.clientes_codigo ??
              '',

            nomcli:
              r.nomcli ??
              '',

            ruc:
              r.ruc ??
              '',

            tipoCliente:
              r.tipoCliente ??
              '',

            fecing:
              r.fecing
                ? new Date(
                  r.fecing
                )
                : '',

            estadoNombre:
              r.estadoNombre ??
              '',

            nPrefijo:
              r.nPrefijo ??
              0,

            checkPrefijo:
              this.formatearCheckExportCorto(
                r.checkPrefijo
              ),

            checkGuia:
              this.formatearCheckExportCorto(
                r.checkGuia
              ),

            checkOtros:
              this.formatearCheckExportCorto(
                r.checkOtros
              )
          })
        );


      const pdfColumnStyles = {

        0:
          {
            cellWidth: 10,
            halign: 'center'
          },

        1:
          {
            cellWidth: 18
          },

        2:
          {
            cellWidth: 65
          },

        3:
          {
            cellWidth: 32
          },

        4:
          {
            cellWidth: 24
          },

        5:
          {
            cellWidth: 18,
            halign: 'center'
          },

        6:
          {
            cellWidth: 24
          },

        7:
          {
            cellWidth: 16,
            halign: 'center'
          },

        8:
          {
            cellWidth: 14,
            halign: 'center'
          },

        9:
          {
            cellWidth: 14,
            halign: 'center'
          },

        10:
          {
            cellWidth: 14,
            halign: 'center'
          }
      };


      const optionsPdf:
        ExportOptionsG = {

        data:
          dataPdf,

        columns:
          columnsPdf,

        headers:
          headersPdf,

        filename:
          'Clientes_PDF',

        title:
          `Clientes – Total (${dataPdf.length})`,

        logoUrl:
          this.logoUrl,

        pdfOverflow:
          'hidden',

        pdfFontSize:
          7,

        pdfColumnStyles
      };


      if (
        tipo ===
        'excel'
      ) {

        await Promise.resolve(
          this.exportService
            .exportarExcel(
              optionsExcel
            )
        );

      }
      else {

        await Promise.resolve(
          this.exportService
            .exportarPDFG(
              optionsPdf
            )
        );
      }

    }
    catch (
      e
    ) {

      console.error(
        e
      );


      this.mostrarAlerta(
        'Error al exportar',
        'Error'
      );

    }
    finally {

      ref.close();
    }
  }


  private formatearCheckExport(
    value:
      any
  ): string {

    return this.toBool(
      value
    )
      ? 'SI'
      : 'NO';
  }


  private formatearCheckExportCorto(
    value:
      any
  ): string {

    return this.toBool(
      value
    )
      ? 'X'
      : '';
  }


  private mapExportRow(
    r:
      any
  ) {

    return {

      clientes_codigo:
        r.clientes_codigo ??
        '',

      nomcli:
        r.nomcli ??
        '',

      dircli:
        r.dircli ??
        '',

      ruc:
        r.ruc ??
        '',

      tipoCliente:
        r.tipoCliente ??
        '',

      grupoEmpresa:
        r.grupoEmpresa ??
        '',

      fecing:
        r.fecing
          ? new Date(
            r.fecing
          )
            .toLocaleDateString(
              'es-EC',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }
            )
          : '',

      zonaReferencia:
        r.zonaReferencia ??
        '',

      estadoNombre:
        r.estadoNombre ??
        '',

      prefijo:
        r.prefijo ??
        '',

      representante:
        r.representante ??
        '',

      telefono:
        r.telefono
          ? `+593${r.telefono}`
          : ''
    };
  }


  private anioMesActual():
    string {

    const d =
      new Date();


    const y =
      d.getFullYear();


    const m =
      String(
        d.getMonth() +
        1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        d.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${y}${m}${day}`;
  }


  // =========================================================
  // RENDER CHECKBOX
  // =========================================================

  private crearCheckboxRenderer(
    field:
      'checkPrefijo' |
      'checkGuia' |
      'checkOtros'
  ): any {

    return (
      params:
        any
    ) => {

      const input =
        document.createElement(
          'input'
        );


      input.type =
        'checkbox';


      input.checked =
        params.data?.[
          field
        ] === true;


      input.style.cursor =
        'pointer';


      input.style.width =
        '15px';


      input.style.height =
        '15px';


      input.addEventListener(
        'change',
        () => {

          if (
            !params.data
          ) {

            return;
          }


          const valorAnterior =
            params.data[
              field
            ] === true;


          const valorNuevo =
            input.checked;


          params.data[
            field
          ] =
            valorNuevo;


          this.actualizarChecksCliente(
            params.data,
            field,
            valorAnterior,
            input
          );
        }
      );


      return input;
    };
  }


  // =========================================================
  // BOOLEAN
  // =========================================================

  private toBool(
    value:
      any
  ): boolean {

    if (
      value ===
      true
    ) {

      return true;
    }


    if (
      value ===
      false ||
      value ===
      null ||
      value ===
      undefined
    ) {

      return false;
    }


    const texto =
      String(
        value
      )
        .trim()
        .toLowerCase();


    return (
      texto ===
      '1' ||

      texto ===
      'true' ||

      texto ===
      'sí' ||

      texto ===
      'si'
    );
  }


  // =========================================================
  // ACTUALIZAR CHECK + AUDITORÍA
  // =========================================================

  private actualizarChecksCliente(
    cliente:
      Cliente,

    field:
      'checkPrefijo' |
      'checkGuia' |
      'checkOtros',

    valorAnterior:
      boolean,

    input:
      HTMLInputElement
  ): void {

    const valorNuevo =
      cliente[
        field
      ] === true;


    // =======================================================
    // REQUEST UPDATE
    // =======================================================

    const request = {

      clientesCodigo:
        Number(
          cliente.clientes_codigo
        ),

      checkPrefijo:
        cliente.checkPrefijo ===
        true,

      checkGuia:
        cliente.checkGuia ===
        true,

      checkOtros:
        cliente.checkOtros ===
        true,

      idUsuario:
        this.usuarioActual
          ?.id_usuario ??
        1
    };


    this.clienteService
      .actualizarDatosAdicionalesCliente(
        request
      )
      .subscribe({

        next:
          (
            resp:
              any
          ) => {

            const tipo =
              String(
                resp?.type ??
                resp?.Type ??
                ''
              )
                .toUpperCase();


            // =================================================
            // UPDATE FALLÓ
            // =================================================

            if (
              tipo !==
              'SUCCESS'
            ) {

              cliente[
                field
              ] =
                valorAnterior;


              input.checked =
                valorAnterior;


              this.mostrarAlerta(

                resp?.message ??
                resp?.Message ??
                'No se pudo actualizar el check.',

                'Advertencia'

              );


              this.gridApi
                ?.refreshCells({
                  force: true
                });


              return;
            }


            // =================================================
            // UPDATE CORRECTO
            // =================================================

            const campoAuditoria =

              field ===
              'checkPrefijo'

                ? 'PREFIJO'

                : field ===
                'checkGuia'

                  ? 'O.COMPRA'

                  : 'OTROS';


            // =================================================
            // REQUEST AUDITORÍA
            // =================================================

            const auditoriaRequest = {

              clientesCodigo:
                Number(
                  cliente.clientes_codigo
                ),

              nombreCliente:
                cliente.nomcli ??
                '',

              campo:
                campoAuditoria,

              valorAnterior:
                valorAnterior,

              valorNuevo:
                valorNuevo,

              idUsuario:
                this.usuarioActual
                  ?.id_usuario ??
                1
            };


            console.log(
              'COMPONENTE - AUDITORÍA:',
              auditoriaRequest
            );


            // =================================================
            // IMPORTANTE:
            // UNA SOLA LLAMADA A AUDITORÍA
            // =================================================

            this.clienteService
              .registrarAuditoriaDatosAdicionalesCliente(
                auditoriaRequest
              )
              .subscribe({

                next:
                  (
                    auditoriaResp:
                      any
                  ) => {

                    console.log(
                      'Auditoría registrada:',
                      auditoriaResp
                    );


                    this.mostrarAlerta(
                      'Datos actualizados y auditoría registrada.',
                      'OK'
                    );
                  },


                error:
                  error => {

                    console.error(
                      'Error registrando auditoría:',
                      error
                    );


                    // ===========================================
                    // NO REVERTIR EL CHECK.
                    //
                    // EL UPDATE YA SE REALIZÓ.
                    // SOLO FALLÓ LA AUDITORÍA.
                    // ===========================================

                    this.mostrarAlerta(
                      'Dato actualizado, pero no se pudo registrar la auditoría.',
                      'Advertencia'
                    );
                  }

              });


            // =================================================
            // REFRESCAR GRID
            // =================================================

            this.gridApi
              ?.refreshCells({
                force: true
              });

          },


        // =====================================================
        // ERROR HTTP UPDATE
        // =====================================================

        error:
          () => {

            cliente[
              field
            ] =
              valorAnterior;


            input.checked =
              valorAnterior;


            this.mostrarAlerta(
              'Error actualizando datos adicionales.',
              'Error'
            );


            this.gridApi
              ?.refreshCells({
                force: true
              });
          }

      });
  }


  // =========================================================
  // ABRIR AUDITORÍA
  // =========================================================

  abrirAuditoria():
    void {

    this.dialog.open(
      AuditoriaClientesComponent,
      {

        width:
          '92vw',

        maxWidth:
          '92vw',

        height:
          '80vh',

        disableClose:
          false,

        autoFocus:
          false
      }
    );
  }
}