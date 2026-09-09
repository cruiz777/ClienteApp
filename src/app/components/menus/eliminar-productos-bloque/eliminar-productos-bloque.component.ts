import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  Router
} from '@angular/router';

import {
  AgGridModule
} from 'ag-grid-angular';

import {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  IsRowSelectable
} from 'ag-grid-community';

import {
  firstValueFrom
} from 'rxjs';

import {
  finalize
} from 'rxjs/operators';

import {
  ProductosBloqueService,
  ProductoBloquePreviewResponse
} from 'src/app/services/productos-bloque.service';

import {
  CustomMessageBoxComponent
} from 'src/app/components/utils/messages/custom-message-box.component';


// ==========================================================
// FILA DEL GRID
// ==========================================================

interface ProductoBloqueGrid
  extends ProductoBloquePreviewResponse {

  numeroFila?: number;
}


// ==========================================================
// COMPONENT
// ==========================================================

@Component({

  selector:
    'app-eliminar-productos-bloque',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    AgGridModule
  ],

  templateUrl:
    './eliminar-productos-bloque.component.html',

  styleUrls: [
    './eliminar-productos-bloque.component.css'
  ]

})
export class EliminarProductosBloqueComponent
  implements OnInit {


  // ========================================================
  // GRID
  // ========================================================

  private gridApi?:
    GridApi<ProductoBloqueGrid>;


  // ========================================================
  // TEXTO PEGADO DESDE EXCEL
  // ========================================================

  codigosExcel =
    '';


  // ========================================================
  // DATOS
  // ========================================================

  rowData:
    ProductoBloqueGrid[] = [];


  productosSeleccionados:
    ProductoBloqueGrid[] = [];


  // ========================================================
  // ESTADOS
  // ========================================================

  buscando =
    false;


  eliminando =
    false;


  hasSearched =
    false;


  // ========================================================
  // USUARIO
  // ========================================================

  idUsuario:
    number | null =
    null;


  // ========================================================
  // RESUMEN
  // ========================================================

  totalCodigos =
    0;


  totalEncontrados =
    0;


  totalNoEncontrados =
    0;


  // ========================================================
  // DEFAULT COLUMNS
  // ========================================================

  defaultColDef:
    ColDef<ProductoBloqueGrid> = {

    sortable:
      true,

    filter:
      true,

    resizable:
      true,

    minWidth:
      80
  };


  // ========================================================
  // IMPORTANTE:
  // SOLO SELECCIONAR PRODUCTOS EXISTENTES
  // ========================================================

  isRowSelectable:
    IsRowSelectable<ProductoBloqueGrid> =
    (node) => {

      return (
        node.data?.existeProducto ===
        true
      );
    };


  // ========================================================
  // COLUMNAS
  // ========================================================

  columnDefs:
    ColDef<ProductoBloqueGrid>[] = [

    // ======================================================
    // CHECK
    // ======================================================

    {
      headerName:
        '',

      colId:
        'seleccion',

      width:
        55,

      minWidth:
        55,

      maxWidth:
        55,

      pinned:
        'left',

      lockPinned:
        true,

      suppressMovable:
        true,

      sortable:
        false,

      filter:
        false,

      resizable:
        false,

      checkboxSelection:
        params =>
          params.data?.existeProducto ===
          true,

      headerCheckboxSelection:
        true,

      headerCheckboxSelectionFilteredOnly:
        true,

      cellClass:
        'cell-check-delete'
    },


    // ======================================================
    // NÚMERO
    // ======================================================

    {
      headerName:
        '#',

      field:
        'numeroFila',

      width:
        48,

      minWidth:
        48,

      maxWidth:
        48,

      pinned:
        'left',

      lockPinned:
        true,

      sortable:
        false,

      filter:
        false,

      cellClass:
        'cell-numero'
    },


    // ======================================================
    // CODBAR
    // ======================================================

    {
      headerName:
        'Código de Barras',

      field:
        'codbar',

      width:
        190,

      minWidth:
        180,

      pinned:
        'left',

      lockPinned:
        true,

      cellClass:
        'cell-codbar'
    },


    // ======================================================
    // DESCRIPCIÓN
    // ======================================================

    {
      headerName:
        'Descripción',

      field:
        'descripcion',

      minWidth:
        320,

      flex:
        1,

      wrapText:
        true,

      autoHeight:
        true,

      valueFormatter:
        params =>
          params.value ||
          'NO ENCONTRADO',

      cellClass:
        params => {

          if (
            params.data
              ?.existeProducto ===
            true
          ) {

            return 'cell-description';
          }

          return 'cell-description-no-found';
        }
    },


    // ======================================================
    // PRODUCTO
    // ======================================================

    {
      headerName:
        'Producto', hide: true,

      field:
        'existeProducto',

      width:
        110,

      minWidth:
        110,

      cellClass:
        'cell-center',

      valueFormatter:
        params =>
          params.value === true
            ? 'SI'
            : 'NO',

      cellClassRules: {

        'cell-ok':
          params =>
            params.value === true,

        'cell-error':
          params =>
            params.value === false
      }
    },


    // ======================================================
    // DATOS ADICIONALES
    // ======================================================

    {
      headerName:
        'Datos Adicionales',hide: true,

      field:
        'existeDatosAdicionales',

      width:
        145,

      minWidth:
        145,

      cellClass:
        'cell-center',

      valueFormatter:
        params =>
          params.value === true
            ? 'SI'
            : 'NO',

      cellClassRules: {

        'cell-ok':
          params =>
            params.value === true,

        'cell-warning':
          params =>
            params.value === false
      }
    },


    // ======================================================
    // CÓDIGO 14
    // ======================================================

    {
      headerName:
        'Código 14',hide: true,

      field:
        'existeCodigo14',

      width:
        115,

      minWidth:
        115,

      cellClass:
        'cell-center',

      valueFormatter:
        params =>
          params.value === true
            ? 'SI'
            : 'NO',

      cellClassRules: {

        'cell-ok':
          params =>
            params.value === true,

        'cell-warning':
          params =>
            params.value === false
      }
    },


    // ======================================================
    // ESTADO
    // ======================================================

    {
      headerName:
        'Estado',

      field:
        'estado',

      width:
        145,

      minWidth:
        145,

      cellClassRules: {

        'estado-encontrado':
          params =>
            String(
              params.value ||
              ''
            )
              .trim()
              .toUpperCase() ===
            'ENCONTRADO',

        'estado-no-encontrado':
          params =>
            String(
              params.value ||
              ''
            )
              .trim()
              .toUpperCase() ===
            'NO ENCONTRADO'
      }
    }
  ];


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private productosBloqueService:
      ProductosBloqueService,

    private dialog:
      MatDialog,

    private router:
      Router

  ) {
  }


  // ========================================================
  // INIT
  // ========================================================

  ngOnInit():
    void {
  }


  // ========================================================
  // GRID READY
  // ========================================================

  onGridReady(
    event:
      GridReadyEvent<
        ProductoBloqueGrid
      >
  ): void {

    this.gridApi =
      event.api;


    setTimeout(
      () => {

        this.gridApi
          ?.sizeColumnsToFit();

      },
      100
    );
  }


  // ========================================================
  // GRID SIZE
  // ========================================================

  onGridSizeChanged():
    void {

    setTimeout(
      () => {

        this.gridApi
          ?.sizeColumnsToFit();

      },
      50
    );
  }


  // ========================================================
  // SELECCIÓN
  // ========================================================

  onSelectionChanged(
    event:
      SelectionChangedEvent<
        ProductoBloqueGrid
      >
  ): void {

    // ======================================================
    // DOBLE CONTROL:
    // SOLO CONSERVAR PRODUCTOS EXISTENTES
    // ======================================================

    this.productosSeleccionados =
      event.api
        .getSelectedRows()
        .filter(
          producto =>
            producto.existeProducto ===
            true
        );
  }


  // ========================================================
  // PEGAR DESDE EXCEL
  // ========================================================

  onPasteExcel(
    event:
      ClipboardEvent
  ): void {

    const texto =
      event.clipboardData
        ?.getData(
          'text'
        ) ||
      '';


    if (
      !texto
    ) {

      return;
    }


    event.preventDefault();


    this.codigosExcel =
      texto;


    // ======================================================
    // BUSCAR AUTOMÁTICAMENTE AL PEGAR
    // ======================================================

    this.buscarCodigos();
  }


  // ========================================================
  // OBTENER CÓDIGOS DESDE TEXTO
  // ========================================================

  private obtenerCodigosPegados():
    string[] {

    if (
      !this.codigosExcel
    ) {

      return [];
    }


    const filas =
      this.codigosExcel
        .split(
          /\r?\n/
        );


    const codigos =
      filas

        .map(
          fila => {

            // ================================================
            // EXCEL PUEDE COPIAR VARIAS COLUMNAS.
            // TOMAMOS LA PRIMERA.
            // ================================================

            const columnas =
              fila.split(
                '\t'
              );


            return (
              columnas[0] ||
              ''
            )
              .trim();
          }
        )

        .filter(
          codigo =>
            codigo.length >
            0
        )

        .map(
          codigo =>
            codigo.replace(
              /\s/g,
              ''
            )
        )

        .filter(
          codigo =>
            /^\d+$/.test(
              codigo
            )
        );


    // ======================================================
    // QUITAR DUPLICADOS
    // ======================================================

    return [
      ...new Set(
        codigos
      )
    ];
  }


  // ========================================================
  // BUSCAR PRODUCTOS
  // ========================================================

  buscarCodigos():
    void {

    if (
      this.buscando ||
      this.eliminando
    ) {

      return;
    }


    const codigos =
      this.obtenerCodigosPegados();


    if (
      codigos.length ===
      0
    ) {

      this.mostrarMensaje(
        'Advertencia',
        'Debe pegar al menos un código de barras válido.',
        'warning'
      );

      return;
    }


    if (
      codigos.length >
      1000
    ) {

      this.mostrarMensaje(
        'Advertencia',
        'Solo puede procesar hasta 1000 códigos por operación.',
        'warning'
      );

      return;
    }


    this.buscando =
      true;


    this.hasSearched =
      true;


    this.productosSeleccionados =
      [];


    this.totalCodigos =
      codigos.length;


    this.totalEncontrados =
      0;


    this.totalNoEncontrados =
      0;


    this.gridApi
      ?.deselectAll();


    this.gridApi
      ?.showLoadingOverlay();


    this.productosBloqueService
      .consultarProductosBloque(
        codigos
      )
      .pipe(

        finalize(
          () => {

            this.buscando =
              false;

          }
        )

      )
      .subscribe({

        next:
          response => {

            if (
              response?.success !==
              true
            ) {

              this.rowData =
                [];


              this.productosSeleccionados =
                [];


              this.gridApi
                ?.showNoRowsOverlay();


              this.mostrarMensaje(
                'Error',
                'No fue posible consultar los productos.',
                'error'
              );


              return;
            }


            this.totalCodigos =
              response.total ??
              0;


            this.totalEncontrados =
              response.encontrados ??
              0;


            this.totalNoEncontrados =
              response.noEncontrados ??
              0;


            this.rowData =
              (
                response.data ||
                []
              )
                .map(
                  (
                    item,
                    index
                  ) => ({

                    ...item,

                    numeroFila:
                      index +
                      1

                  })
                );


            // ==================================================
            // NO SELECCIONAR AUTOMÁTICAMENTE
            // ==================================================

            this.productosSeleccionados =
              [];


            setTimeout(
              () => {

                this.gridApi
                  ?.deselectAll();


                if (
                  this.rowData.length ===
                  0
                ) {

                  this.gridApi
                    ?.showNoRowsOverlay();

                }
                else {

                  this.gridApi
                    ?.hideOverlay();

                }


                this.gridApi
                  ?.sizeColumnsToFit();

              },
              100
            );
          },


        error:
          error => {

            console.error(
              'Error consultando productos en bloque:',
              error
            );


            this.rowData =
              [];


            this.productosSeleccionados =
              [];


            this.totalEncontrados =
              0;


            this.totalNoEncontrados =
              0;


            this.gridApi
              ?.showNoRowsOverlay();


            this.mostrarMensaje(
              'Error',
              error?.error
                ?.message ||
              'Error consultando productos.',
              'error'
            );
          }

      });
  }


  // ========================================================
  // SELECCIONAR ENCONTRADOS
  // ========================================================

  seleccionarEncontrados():
    void {

    if (
      !this.gridApi
    ) {

      return;
    }


    this.gridApi
      .deselectAll();


    this.gridApi
      .forEachNode(
        node => {

          if (
            node.data
              ?.existeProducto ===
            true
          ) {

            node.setSelected(
              true
            );
          }
        }
      );
  }


  // ========================================================
  // QUITAR SELECCIÓN
  // ========================================================

  limpiarSeleccion():
    void {

    this.gridApi
      ?.deselectAll();


    this.productosSeleccionados =
      [];
  }


  // ========================================================
  // VALIDAR SI SE PUEDE ELIMINAR
  // ========================================================

  get puedeEliminar():
    boolean {

    return (

      this.productosSeleccionados
        .length >
      0 &&

      !this.eliminando &&

      !this.buscando

    );
  }


  // ========================================================
  // TEXTO BOTÓN ELIMINAR
  // ========================================================

  get textoEliminar():
    string {

    if (
      this.eliminando
    ) {

      return 'Eliminando...';
    }


    return (
      `Eliminar seleccionados (${this.productosSeleccionados.length})`
    );
  }


  // ========================================================
  // ELIMINAR PRODUCTOS
  // ========================================================

  async eliminarSeleccionados():
    Promise<void> {

    if (
      !this.puedeEliminar
    ) {

      return;
    }


    // ======================================================
    // ÚLTIMO FILTRO DE SEGURIDAD
    // ======================================================

    const seleccionados =
      this.productosSeleccionados

        .filter(
          item =>
            item.existeProducto ===
            true
        );


    const codigos =
      seleccionados

        .map(
          item =>
            item.codbar
        )

        .filter(
          codigo =>
            !!codigo
        );


    if (
      codigos.length ===
      0
    ) {

      this.mostrarMensaje(
        'Advertencia',
        'No existen productos válidos seleccionados.',
        'warning'
      );

      return;
    }


    const detalle =
      seleccionados

        .map(
          item =>
            `${item.codbar} - ${item.descripcion ?? ''}`
        )

        .join(
          '\n'
        );


    const confirmar =
      await this.confirmar(

        'Confirmar eliminación',

        `Está a punto de eliminar ${codigos.length} producto(s).\n\n` +

        detalle +

        '\n\nSe eliminarán primero los registros de CODIGOS14, luego PRODUCTO_DATOS_ADICIONALES y finalmente PRODUCTO.'

      );


    if (
      confirmar !==
      true
    ) {

      return;
    }


    this.eliminando =
      true;


    this.productosBloqueService
      .eliminarProductosBloque(
        codigos,
        this.idUsuario
      )
      .pipe(

        finalize(
          () => {

            this.eliminando =
              false;

          }
        )

      )
      .subscribe({

        next:
          response => {

            if (
              response?.success !==
              true
            ) {

              this.mostrarMensaje(
                'Error',
                response?.message ||
                'No fue posible eliminar los productos.',
                'error'
              );


              return;
            }


            const eliminados =
              response.data
                ?.totalEliminados ??
              0;


            const noEncontrados =
              response.data
                ?.totalNoEncontrados ??
              0;


            if (
              eliminados >
              0
            ) {

              this.mostrarMensaje(

                'Éxito',

                `Se eliminaron ${eliminados} producto(s) correctamente.` +

                (
                  noEncontrados >
                  0
                    ? ` ${noEncontrados} código(s) no fueron encontrados.`
                    : ''
                ),

                'success'

              );

            }
            else {

              this.mostrarMensaje(
                'Advertencia',
                'No se eliminó ningún producto.',
                'warning'
              );
            }


            this.productosSeleccionados =
              [];


            this.gridApi
              ?.deselectAll();


            // ==================================================
            // VOLVER A CONSULTAR
            //
            // LOS ELIMINADOS DEBERÁN APARECER COMO NO ENCONTRADOS
            // ==================================================

            this.buscarCodigos();
          },


        error:
          error => {

            console.error(
              'Error eliminando productos en bloque:',
              error
            );


            this.mostrarMensaje(
              'Error',
              error?.error
                ?.message ||
              error?.error
                ?.error ||
              'Error eliminando productos.',
              'error'
            );
          }

      });
  }


  // ========================================================
  // LIMPIAR TODO
  // ========================================================

  limpiar():
    void {

    this.codigosExcel =
      '';


    this.rowData =
      [];


    this.productosSeleccionados =
      [];


    this.totalCodigos =
      0;


    this.totalEncontrados =
      0;


    this.totalNoEncontrados =
      0;


    this.hasSearched =
      false;


    this.gridApi
      ?.deselectAll();


    this.gridApi
      ?.showNoRowsOverlay();
  }


  // ========================================================
  // CERRAR
  // ========================================================

  cerrar():
    void {

    this.router.navigate(
      [
        '/codbar/validacion/eliminar-productos'
      ]
    );
  }


  // ========================================================
  // MENSAJE
  // ========================================================

  private mostrarMensaje(

    title:
      string,

    message:
      string,

    type:
      'success' |
      'error' |
      'warning' |
      'info'

  ): void {

    this.dialog.open(
      CustomMessageBoxComponent,
      {

        data: {

          title,

          message,

          type,

          confirmText:
            'Aceptar',

          showCancel:
            false
        },

        width:
          '440px'
      }
    );
  }


  // ========================================================
  // CONFIRMAR
  // ========================================================

  private async confirmar(

    title:
      string,

    message:
      string

  ): Promise<
    boolean |
    null
  > {

    const dialogRef =
      this.dialog.open(
        CustomMessageBoxComponent,
        {

          data: {

            title,

            message,

            type:
              'warning',

            confirmText:
              'Sí, eliminar',

            cancelText:
              'Cancelar',

            showCancel:
              true
          },

          width:
            '560px',

          disableClose:
            false
        }
      );


    return await firstValueFrom(
      dialogRef
        .afterClosed()
    );
  }
}