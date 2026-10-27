import {
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  PageEvent
} from '@angular/material/paginator';

import {
  catchError,
  finalize
} from 'rxjs/operators';

import {
  firstValueFrom,
  forkJoin,
  of
} from 'rxjs';

import {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent
} from 'ag-grid-community';

import {
  AgGridAngular
} from 'ag-grid-angular';

import {
  MatDialog
} from '@angular/material/dialog';

import {
  AuditoriaProductosVerifiedComponent
} from './auditoria-productos-verified/auditoria-productos-verified.component';

import {
  ValidacionService
} from 'src/app/services/validacion.service';

import {
  ProductoLicenseQuery
} from 'src/app/interfaces/responses/export-products-response';

import {
  ProductoLicenseResponse
} from 'src/app/interfaces/responses/products-license-response';

import {
  CustomMessageBoxComponent
} from 'src/app/components/utils/messages/custom-message-box.component';

import {
  RequiredFieldsToastService
} from 'src/app/components/utils/messages/required-fields-toast.service';

import {
  PermissionsService
} from 'src/app/services/permission.service';


// ==========================================================
// SEARCH PARAMS
// ==========================================================

export interface SearchParams {

  registro?: string;

  ruc?: string;

  tipo?: string;

  prefijo?: string;

  fechaDesde?: string;

  fechaHasta?: string;

  prefijoEstado?: string;

  empresaEstado?: string;

  gtinEstado?: string;

  idUsuario?: number;

  nombreCliente?: string;
}


// ==========================================================
// PRODUCT
// ==========================================================

export interface Product {

  id?: number;

  gtin: string;

  gtinStatus: string;

  licenceKey: string;

  licenceType: string;

  brandName: string;

  productDescription: string;

  productImageUrl?: string;

  netContentValue?: string;

  netContentUnitCode?: string;

  nombreCliente: string;

  codigoPrefijo: string;

  fechaCreacion?: string;
}


// ==========================================================
// RESULTADO INTERNO AUDITORÍA
// ==========================================================

interface ResultadoAuditoriaProducto {

  success: boolean;

  gtin: string;

  response?: any;

  error?: any;
}


@Component({

  selector:
    'app-eliminar-products',

  templateUrl:
    './eliminar-products.component.html',

  styleUrls: [
    './eliminar-products.component.css'
  ]

})
export class EliminarProductsComponent
  implements OnInit {


  // ========================================================
  // VIEW CHILD
  // ========================================================

  @ViewChild(
    'campoBuscarNombre',
    {
      static: false
    }
  )
  campoBuscarNombre!:
    ElementRef<HTMLInputElement>;


  @ViewChild(
    'searchInput',
    {
      static: false
    }
  )
  searchInput!:
    ElementRef<HTMLInputElement>;


  @ViewChild(
    AgGridAngular
  )
  agGrid?:
    AgGridAngular;


  // ========================================================
  // BUSQUEDA
  // ========================================================

  terminoBusquedaNombre =
    '';


  searchParams:
    SearchParams = {};


  // ========================================================
  // DATOS
  // ========================================================

  productos:
    Product[] = [];


  productosOriginales:
    ProductoLicenseResponse[] = [];


  productosSeleccionados:
    Product[] = [];


  // ========================================================
  // ESTADOS
  // ========================================================

  isLoading =
    false;


  hasSearched =
    false;


  errorMessage =
    '';


  eliminando =
    false;


  // ========================================================
  // PAGINACIÓN
  // ========================================================

  currentPage =
    1;


  pageSize =
    10;


  totalItems =
    0;


  totalPages =
    0;


  // ========================================================
  // GRID API
  // ========================================================

  private gridApi?:
    GridApi<Product>;


  // ========================================================
  // DEFAULT COLUMN
  // ========================================================

  defaultColDef:
    ColDef<Product> = {

    sortable:
      true,

    filter:
      true,

    resizable:
      true,

    minWidth:
      100
  };


  columnDefs:
    ColDef<Product>[] = [];


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private validacionService:
      ValidacionService,

    private dialog:
      MatDialog,

    private requiredFieldsToast:
      RequiredFieldsToastService,

    public permissions:
      PermissionsService

  ) {
  }


  // ========================================================
  // INIT
  // ========================================================

  ngOnInit():
    void {

    this.configurarColumnasGrid();
  }


  // ========================================================
  // REGISTROS
  // ========================================================

  get numeroRegistros():
    string {

    if (
      !this.hasSearched
    ) {

      return 'Sin registros';
    }


    if (
      this.isLoading
    ) {

      return 'Buscando...';
    }


    return this.totalItems
      .toString();
  }


  get startItem():
    number {

    return this.totalItems === 0

      ? 0

      : (
        this.currentPage - 1
      ) *
      this.pageSize +
      1;
  }


  get endItem():
    number {

    const end =
      this.currentPage *
      this.pageSize;


    return end >
      this.totalItems

      ? this.totalItems

      : end;
  }


  get hasResults():
    boolean {

    return (
      this.hasSearched &&
      this.productos.length >
      0
    );
  }


  get noResults():
    boolean {

    return (
      this.hasSearched &&
      this.productos.length ===
      0 &&
      !this.isLoading
    );
  }


  // ========================================================
  // VALIDAR BÚSQUEDA
  // ========================================================

  get puedeRealizarBusqueda():
    boolean {

    const esStringValido =
      (
        valor:
          string |
          undefined
      ): boolean => {

        return (
          valor !==
          undefined &&
          valor !==
          null &&
          valor
            .trim()
            .length >
          0
        );
      };


    const esNumeroValido =
      (
        valor:
          number |
          undefined
      ): boolean => {

        return (
          valor !==
          undefined &&
          valor !==
          null &&
          valor >
          0
        );
      };


    const tieneRuc =
      esStringValido(
        this.searchParams.ruc
      );


    const tienePrefijo =
      esStringValido(
        this.searchParams.prefijo
      );


    const tieneFechaDesde =
      esStringValido(
        this.searchParams.fechaDesde
      );


    const tieneFechaHasta =
      esStringValido(
        this.searchParams.fechaHasta
      );


    const tieneNombreCliente =
      esStringValido(
        this.searchParams.nombreCliente
      );


    const tieneBusquedaGeneral =
      esStringValido(
        this.terminoBusquedaNombre
      );


    const tienePrefijoEstado =
      esStringValido(
        this.searchParams.prefijoEstado
      );


    const tieneEmpresaEstado =
      esStringValido(
        this.searchParams.empresaEstado
      );


    const tieneGtinEstado =
      esStringValido(
        this.searchParams.gtinEstado
      );


    const tieneIdUsuario =
      esNumeroValido(
        this.searchParams.idUsuario
      );


    return (
      tieneRuc ||
      tienePrefijo ||
      tieneFechaDesde ||
      tieneFechaHasta ||
      tieneNombreCliente ||
      tienePrefijoEstado ||
      tieneEmpresaEstado ||
      tieneBusquedaGeneral ||
      tieneGtinEstado ||
      tieneIdUsuario
    );
  }


  get mensajeBotonBuscar():
    string {

    if (
      this.isLoading
    ) {

      return 'Buscando...';
    }


    if (
      !this.puedeRealizarBusqueda
    ) {

      return 'Ingrese al menos un criterio de búsqueda';
    }


    return 'Buscar';
  }


  // ========================================================
  // ELIMINAR
  // ========================================================

  get puedeEliminarSeleccionados():
    boolean {

    return (
      this.productosSeleccionados
        .length >
      0 &&
      !this.eliminando &&
      !this.isLoading
    );
  }


  get textoBotonEliminar():
    string {

    if (
      this.eliminando
    ) {

      return 'Eliminando...';
    }


    if (
      this.productosSeleccionados
        .length >
      0
    ) {

      return (
        `Eliminar seleccionados (${this.productosSeleccionados.length})`
      );
    }


    return 'Eliminar seleccionados';
  }


  // ========================================================
  // COLUMNAS GRID
  // ========================================================

  private configurarColumnasGrid():
    void {

    this.columnDefs = [

      {
        headerName:
          'Cliente',

        field:
          'nombreCliente',

        width:
          230,

        pinned:
          'left',

        lockPinned:
          true
      },


      {
        headerName:
          'GTIN',

        field:
          'gtin',

        width:
          150,

        cellClass:
          'cell-gtin-bold'
      },


      {
        headerName:
          'GTIN Status',

        field:
          'gtinStatus',

        width:
          130,

        cellClass:
          params => {

            const estado =
              String(
                params.value ??
                ''
              )
                .toLowerCase();


            if (
              estado ===
              'active'
            ) {

              return 'cell-status-active';
            }


            if (
              estado ===
              'inactive'
            ) {

              return 'cell-status-inactive';
            }


            return 'cell-status-pending';
          }
      },


      {
        headerName:
          'Licence Key',

        field:
          'licenceKey',

        width:
          140,

        hide:
          true
      },


      {
        headerName:
          'Licence Type',

        field:
          'licenceType',

        width:
          130,

        hide:
          true
      },


      {
        headerName:
          'Brand Name',

        field:
          'brandName',

        width:
          170,

        hide:
          true
      },


      {
        headerName:
          'Product Description',

        field:
          'productDescription',

        width:
          360,

        wrapText:
          true,

        autoHeight:
          true,

        cellClass:
          'cell-description-bold'
      },


      {
        headerName:
          '',

        colId:
          'seleccion',

        width:
          100,

        minWidth:
          100,

        maxWidth:
          100,

        pinned:
          'right',

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
          true,

        headerCheckboxSelection:
          true,

        headerCheckboxSelectionFilteredOnly:
          true,

        cellClass:
          'cell-check-delete'
      }

    ];
  }


  // ========================================================
  // GRID EVENTS
  // ========================================================

  onGridReady(
    event:
      GridReadyEvent<Product>
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


  onSelectionChanged(
    event:
      SelectionChangedEvent<Product>
  ): void {

    this.productosSeleccionados =
      event.api
        .getSelectedRows();
  }


  // ========================================================
  // MAPEAR PARÁMETROS
  // ========================================================

  private mapearParametrosBusqueda():
    ProductoLicenseQuery {

    const query:
      ProductoLicenseQuery = {

      pageNumber:
        this.currentPage,

      pageSize:
        this.pageSize
    };


    if (
      this.searchParams.ruc
    ) {

      query.ruc =
        this.searchParams.ruc;
    }


    if (
      this.searchParams.prefijo
    ) {

      query.codigoPrefijo =
        this.searchParams.prefijo;
    }


    if (
      this.searchParams.fechaDesde
    ) {

      query.fechaDesde =
        this.searchParams.fechaDesde;
    }


    if (
      this.searchParams.fechaHasta
    ) {

      query.fechaHasta =
        this.searchParams.fechaHasta;
    }


    if (
      this.searchParams.nombreCliente
    ) {

      query.nombreCliente =
        this.searchParams.nombreCliente;
    }


    if (
      this.searchParams.idUsuario
    ) {

      query.idUsuario =
        this.searchParams.idUsuario;
    }


    if (
      this.searchParams.prefijoEstado
    ) {

      query.estadoPrefijo =
        this.searchParams.prefijoEstado ===
        'active';
    }


    if (
      this.searchParams.empresaEstado
    ) {

      query.estadoEmpresa =
        this.searchParams.empresaEstado ===
        'active'
          ? 1
          : 2;
    }


    if (
      this.searchParams.gtinEstado
    ) {

      query.estadoGtin =
        this.searchParams.gtinEstado ===
        'active';
    }


    return query;
  }


  // ========================================================
  // MAPEAR RESPUESTA
  // ========================================================

  private mapearRespuestaServicio(
    productos:
      ProductoLicenseResponse[]
  ): Product[] {

    return productos.map(
      (
        producto,
        index
      ) => ({

        id:
          producto.producto_id ||
          index,

        gtin:
          producto.gtin ||
          'N/A',

        gtinStatus:
          producto.gtin_status ||
          'Unknown',

        licenceKey:
          producto.licence_key ||
          'N/A',

        licenceType:
          producto.licence_type ||
          'GCP',

        brandName:
          producto.brand_name ||
          'N/A',

        productDescription:
          producto.product_description ||
          'N/A',

        productImageUrl:
          producto.product_image_url ||
          'N/A',

        netContentValue:
          producto.net_content_value ||
          'N/A',

        netContentUnitCode:
          producto.net_content_unit_code ||
          'N/A',

        nombreCliente:
          producto.nombre_cliente ||
          'N/A',

        codigoPrefijo:
          producto.codigo_prefijo ||
          'N/A',

        fechaCreacion:
          producto.fecha_creacion ||
          'N/A'

      })
    );
  }


  // ========================================================
  // BUSCAR
  // ========================================================

  buscar():
    void {

    this.isLoading =
      true;


    this.hasSearched =
      true;


    this.errorMessage =
      '';


    this.productosSeleccionados =
      [];


    const query =
      this.mapearParametrosBusqueda();


    this.gridApi
      ?.showLoadingOverlay();


    this.validacionService
      .getProductosLicense(
        query
      )
      .pipe(

        catchError(
          (
            error: any
          ) => {

            console.error(
              'Error al buscar productos:',
              error
            );


            this.errorMessage =
              'Error al cargar los datos. Por favor, intente nuevamente.';


            return of(
              null
            );
          }
        ),


        finalize(
          () => {

            this.isLoading =
              false;
          }
        )

      )
      .subscribe(
        (
          response: any
        ) => {

          if (
            response &&
            response.data
          ) {

            this.productosOriginales =
              response.data.items ||
              [];


            this.productos =
              this.mapearRespuestaServicio(
                this.productosOriginales
              );


            this.totalItems =
              response.data.totalItems ||
              0;


            this.totalPages =
              response.data.totalPages ||
              0;


            this.currentPage =
              response.data.page ||
              1;


            this.gridApi
              ?.deselectAll();


            if (
              this.productos.length ===
              0
            ) {

              this.gridApi
                ?.showNoRowsOverlay();


              this.mostrarInstruccionesPopup();

            }
            else {

              this.gridApi
                ?.hideOverlay();
            }


            setTimeout(
              () => {

                this.gridApi
                  ?.sizeColumnsToFit();

              },
              100
            );

          }
          else {

            this.productos =
              [];


            this.productosOriginales =
              [];


            this.productosSeleccionados =
              [];


            this.totalItems =
              0;


            this.totalPages =
              0;


            this.errorMessage =
              response?.message ||
              'No se encontraron datos';


            this.gridApi
              ?.showNoRowsOverlay();


            this.mostrarInstruccionesPopup();
          }
        }
      );
  }


  // ========================================================
  // PAGINACIÓN
  // ========================================================

  onPageChange(
    event:
      PageEvent
  ): void {

    this.currentPage =
      event.pageIndex +
      1;


    this.pageSize =
      event.pageSize;


    this.buscar();
  }


  // ========================================================
  // NUEVA BÚSQUEDA
  // ========================================================

  nuevaBusqueda():
    void {

    this.searchParams =
      {};


    this.terminoBusquedaNombre =
      '';


    if (
      this.searchInput
        ?.nativeElement
    ) {

      this.searchInput
        .nativeElement
        .value =
        '';
    }


    if (
      this.campoBuscarNombre
        ?.nativeElement
    ) {

      this.campoBuscarNombre
        .nativeElement
        .value =
        '';
    }


    this.hasSearched =
      false;


    this.currentPage =
      1;


    this.errorMessage =
      '';


    this.productos =
      [];


    this.productosOriginales =
      [];


    this.productosSeleccionados =
      [];


    this.totalItems =
      0;


    this.totalPages =
      0;


    this.gridApi
      ?.deselectAll();


    this.gridApi
      ?.showNoRowsOverlay();
  }


  // ========================================================
  // BÚSQUEDA GENERAL
  // ========================================================

  buscarGeneral(
    termino:
      string
  ): void {

    this.terminoBusquedaNombre =
      termino;


    if (
      !termino
        .trim()
    ) {

      this.searchParams
        .nombreCliente =
        undefined;


      this.buscar();

      return;
    }


    this.searchParams
      .nombreCliente =
      termino.trim();


    this.currentPage =
      1;


    this.buscar();
  }


  onBusquedaGeneralChange(
    termino:
      string
  ): void {

    this.terminoBusquedaNombre =
      termino;


    if (
      termino
        .trim()
    ) {

      this.searchParams
        .nombreCliente =
        termino.trim();

    }
    else {

      this.searchParams
        .nombreCliente =
        undefined;
    }
  }


  // ========================================================
  // CONFIRMAR ELIMINACIÓN
  // ========================================================

  async eliminarSeleccionados():
    Promise<void> {

    if (
      !this.productosSeleccionados
        .length
    ) {

      this.showMessageBox(
        'Advertencia',
        'Debe seleccionar al menos un producto para eliminar.',
        'warning'
      );

      return;
    }


    const gtins =
      this.productosSeleccionados

        .map(
          x =>
            x.gtin
        )

        .filter(
          x =>
            x &&
            x !==
            'N/A'
        );


    if (
      !gtins.length
    ) {

      this.showMessageBox(
        'Advertencia',
        'Los productos seleccionados no tienen GTIN válido.',
        'warning'
      );

      return;
    }


    const mensaje =

      `¿Está seguro de eliminar los ${gtins.length} código(s) seleccionado(s)?\n\n` +

      gtins.join(
        '\n'
      );


    const confirmar =
      await this.showConfirmDialog(

        'Confirmar eliminación',

        mensaje,

        'warning',

        'Sí, eliminar',

        'Cancelar'

      );


    if (
      confirmar !==
      true
    ) {

      return;
    }


    this.eliminarGtinsSeleccionados(
      gtins
    );
  }


  // ========================================================
  // ELIMINAR + AUDITORÍA
  // ========================================================

  private eliminarGtinsSeleccionados(
    gtins:
      string[]
  ): void {

    this.eliminando =
      true;


    this.isLoading =
      true;


    // ======================================================
    // MUY IMPORTANTE:
    // GUARDAMOS COPIA DE LOS PRODUCTOS SELECCIONADOS
    //
    // Así no perdemos nombreCliente, marca, descripción,
    // prefijo, licenceKey, etc.
    // ======================================================

    const productosAntesEliminar:
      Product[] =
      this.productosSeleccionados
        .map(
          producto => ({
            ...producto
          })
        );


    // ======================================================
    // DELETE VERIFIED
    // ======================================================

    const requests =
      gtins.map(
        gtin =>

          this.validacionService
            .eliminarProductoVerified({

              gtin:

                gtin,

              idUsuario:

                this.searchParams
                  .idUsuario ??
                null

            })
      );


    forkJoin(
      requests
    )
      .pipe(

        catchError(
          (
            error:
              any
          ) => {

            console.error(
              'Error eliminando productos:',
              error
            );


            this.showMessageBox(

              'Error',

              'No se pudo eliminar uno o más productos en Verified.',

              'error'

            );


            return of(
              null
            );
          }
        )

      )
      .subscribe(
        (
          responses:
            any[] |
            null
        ) => {

          if (
            !responses
          ) {

            this.eliminando =
              false;


            this.isLoading =
              false;


            return;
          }


          // ==================================================
          // FALLIDOS
          // ==================================================

          const fallidos =
            responses.filter(
              resp => {

                const tipo =
                  String(
                    resp?.type ??
                    resp?.Type ??
                    ''
                  )
                    .toUpperCase();


                return tipo !==
                  'SUCCESS';
              }
            );


          // ==================================================
          // EXITOSOS
          // ==================================================

          const gtinsEliminados =
            new Set<string>();


          const productosEliminados:
            Product[] = [];


          responses.forEach(
            (
              resp:
                any,

              index:
                number
            ) => {

              const tipo =
                String(
                  resp?.type ??
                  resp?.Type ??
                  ''
                )
                  .toUpperCase();


              if (
                tipo !==
                'SUCCESS'
              ) {

                return;
              }


              const gtin =
                gtins[
                  index
                ];


              gtinsEliminados.add(
                gtin
              );


              const producto =
                productosAntesEliminar
                  .find(
                    x =>
                      x.gtin ===
                      gtin
                  );


              if (
                producto
              ) {

                productosEliminados
                  .push(
                    producto
                  );
              }

            }
          );


          // ==================================================
          // NO SE ELIMINÓ NINGUNO
          // ==================================================

          if (
            productosEliminados.length ===
            0
          ) {

            this.eliminando =
              false;


            this.isLoading =
              false;


            this.productosSeleccionados =
              [];


            this.gridApi
              ?.deselectAll();


            this.showMessageBox(

              'Advertencia',

              'No se eliminó ningún producto.',

              'warning'

            );


            return;
          }


          // ==================================================
          // CREAR REQUESTS DE AUDITORÍA
          // ==================================================

          const auditoriaRequests =
            productosEliminados.map(
              producto => {


                const auditoriaRequest = {

                  gtin:
                    producto.gtin,

                  nombreCliente:
                    producto.nombreCliente,

                  codigoPrefijo:
                    producto.codigoPrefijo,

                  licenceKey:
                    producto.licenceKey,

                  brandName:
                    producto.brandName,

                  productDescription:
                    producto.productDescription,

                  gtinStatusAnterior:
                    producto.gtinStatus,

                  idUsuario:
                    this.searchParams
                      .idUsuario ??
                    null

                };


                console.log(
                  'AUDITORÍA PRODUCTO A ENVIAR:',
                  auditoriaRequest
                );


                // ==============================================
                // IMPORTANTE:
                // catchError individual para que si una auditoría
                // falla, las demás continúen.
                // ==============================================

                return this.validacionService
                  .registrarAuditoriaEliminarProducto(
                    auditoriaRequest
                  )
                  .pipe(

                    mapRespuestaAuditoria(
                      producto.gtin
                    ),

                    catchError(
                      error => {

                        console.error(

                          'Falló auditoría para GTIN:',

                          producto.gtin,

                          error

                        );


                        return of<
                          ResultadoAuditoriaProducto
                        >({

                          success:
                            false,

                          gtin:
                            producto.gtin,

                          error:
                            error

                        });
                      }
                    )

                  );

              }
            );


          // ==================================================
          // EJECUTAR TODAS LAS AUDITORÍAS
          // ==================================================

          forkJoin(
            auditoriaRequests
          )
            .pipe(

              finalize(
                () => {

                  this.eliminando =
                    false;


                  this.isLoading =
                    false;
                }
              )

            )
            .subscribe(
              resultadosAuditoria => {


                // ==============================================
                // ACTUALIZAR GRID
                // ==============================================

                this.productos =
                  this.productos
                    .filter(
                      x =>
                        !gtinsEliminados
                          .has(
                            x.gtin
                          )
                    );


                this.productosOriginales =
                  this.productosOriginales
                    .filter(
                      x =>
                        !gtinsEliminados
                          .has(
                            x.gtin ??
                            ''
                          )
                    );


                this.totalItems =
                  Math.max(

                    0,

                    this.totalItems -
                    gtinsEliminados.size

                  );


                // ==============================================
                // LIMPIAR SELECCIÓN
                // ==============================================

                this.productosSeleccionados =
                  [];


                this.gridApi
                  ?.deselectAll();


                // ==============================================
                // CONTAR AUDITORÍAS
                // ==============================================

                const auditoriasCorrectas =
                  resultadosAuditoria
                    .filter(
                      x =>
                        x.success
                    );


                const auditoriasFallidas =
                  resultadosAuditoria
                    .filter(
                      x =>
                        !x.success
                    );


                console.log(
                  'AUDITORÍAS CORRECTAS:',
                  auditoriasCorrectas
                );


                console.log(
                  'AUDITORÍAS FALLIDAS:',
                  auditoriasFallidas
                );


                // ==============================================
                // RECARGAR
                // ==============================================

                if (
                  this.productos.length ===
                  0 &&
                  this.totalItems >
                  0
                ) {

                  this.buscar();
                }


                // ==============================================
                // MENSAJE FINAL
                // ==============================================

                if (
                  auditoriasFallidas.length ===
                  0
                ) {

                  this.showMessageBox(

                    'Éxito',

                    `Se eliminaron ${gtinsEliminados.size} producto(s) correctamente en Verified y se registraron ${auditoriasCorrectas.length} auditoría(s).`,

                    'success'

                  );

                }
                else {

                  this.showMessageBox(

                    'Advertencia',

                    `Se eliminaron ${gtinsEliminados.size} producto(s) en Verified, pero ${auditoriasFallidas.length} auditoría(s) no pudieron registrarse.`,

                    'warning'

                  );
                }


                // ==============================================
                // MOSTRAR FALLIDOS DE ELIMINACIÓN
                // ==============================================

                if (
                  fallidos.length >
                  0
                ) {

                  console.warn(
                    'Productos que no fueron eliminados:',
                    fallidos
                  );
                }

              }
            );

        }
      );
  }


  // ========================================================
  // MESSAGE BOX
  // ========================================================

  private showMessageBox(

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
          '420px'

      }
    );
  }


  // ========================================================
  // CONFIRM
  // ========================================================

  private async showConfirmDialog(

    title:
      string,

    message:
      string,

    type:
      'success' |
      'error' |
      'warning' |
      'info',

    confirmText:
      string =
      'Sí',

    cancelText:
      string =
      'No'

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

            type,

            confirmText,

            cancelText,

            showCancel:
              true

          },

          width:
            '480px',

          disableClose:
            false

        }
      );


    return await firstValueFrom(
      dialogRef
        .afterClosed()
    );
  }


  // ========================================================
  // INSTRUCCIONES
  // ========================================================

  private mostrarInstruccionesPopup():
    void {

    const instrucciones = [

      '<strong>Eliminar Productos Verified</strong>',

      '',

      'Utilice los filtros anteriores para buscar productos en el sistema.',

      '',

      '<strong>Opciones de búsqueda:</strong>',

      '• <strong>Búsqueda rápida:</strong> Use el campo de búsqueda general por nombre.',

      '• <strong>Filtros específicos:</strong> RUC, prefijo, estados.',

      '• <strong>Filtros de fecha:</strong> Rango de fechas entre dos fechas.',

      '• <strong>Acción:</strong> Seleccione uno o varios productos y presione Eliminar seleccionados.'

    ];


    const mensajeHTML =
      instrucciones.join(
        '<br>'
      );


    this.requiredFieldsToast
      .info(

        mensajeHTML,

        'Instrucciones de Búsqueda'

      );
  }


  // ========================================================
  // ABRIR AUDITORÍA
  // ========================================================

  abrirAuditoriaProductos():
    void {

    this.dialog.open(

      AuditoriaProductosVerifiedComponent,

      {

        width:
          '94vw',

        maxWidth:
          '94vw',

        height:
          '82vh',

        disableClose:
          false,

        autoFocus:
          false

      }

    );
  }
}


// ==========================================================
// OPERADOR AUXILIAR PARA MAPEAR LA RESPUESTA DE AUDITORÍA
// ==========================================================

import {
  map
} from 'rxjs/operators';


function mapRespuestaAuditoria(
  gtin:
    string
) {

  return map(
    (
      response:
        any
    ):
      ResultadoAuditoriaProducto => {

      return {

        success:
          response?.success ===
          true,

        gtin:
          gtin,

        response:
          response

      };
    }
  );
}