import {
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  AuditoriaLicenciasVerifiedComponent
} from '../auditoria-licencias-verified/auditoria-licencias-verified.component';

import {
  PageEvent
} from '@angular/material/paginator';

import {
  MatDialog
} from '@angular/material/dialog';

import {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  GetRowIdParams
} from 'ag-grid-community';

import {
  of,
  firstValueFrom
} from 'rxjs';

import {
  catchError,
  finalize
} from 'rxjs/operators';

import {
  ClienteLicenseResponse
} from 'src/app/interfaces/responses/cliente-license-response';

import {
  ClienteLicenseQuery,
  ValidacionService
} from 'src/app/services/validacion.service';

import {
  ExportLicenseItem,
  ExportLicenseQuery,
  ExportLicenseResponse
} from 'src/app/interfaces/responses/export-licenses-response';

import {
  CustomMessageBoxComponent
} from 'src/app/components/utils/messages/custom-message-box.component';

import {
  RequiredFieldsToastService
} from 'src/app/components/utils/messages/required-fields-toast.service';

import {
  CustomValidators
} from 'src/app/components/utils/validators/validator.util';

import {
  PermissionsService
} from 'src/app/services/permission.service';


export interface SearchParams {

  registro?: string;

  ruc?: string;

  tipo?: string;

  prefijo?: string;

  fechaDesde?: string;

  fechaHasta?: string;

  fechaIgual?: string;

  prefijoEstado?: string;

  empresaEstado?: string;

  nombreCliente?: string;
}


export interface License {

  id?: number;

  licenseKey?: string;

  licenseType: string;

  licenseStatus: string;

  licenseName: string;

  licenseGLN: string;

  address: string;

  addressSuburb: string;

  addressLocality: string;

  addressRegion: string;

  telephone: string;

  email: string;

  website: string;
}


@Component({

  selector:
    'app-editar-licenses',

  templateUrl:
    './editar-licenses.component.html',

  styleUrls: [
    './editar-licenses.component.css'
  ]

})
export class EditarLicensesComponent
  implements OnInit {


  // ==========================================================
  // VIEW CHILD
  // ==========================================================

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


  // ==========================================================
  // BÚSQUEDA
  // ==========================================================

  terminoBusquedaNombre =
    '';


  searchParams:
    SearchParams = {};


  // ==========================================================
  // DATOS
  // ==========================================================

  licencias:
    License[] = [];


  licenciasOriginales:
    ClienteLicenseResponse[] = [];


  // ==========================================================
  // ESTADOS
  // ==========================================================

  isLoading =
    false;


  hasSearched =
    false;


  errorMessage =
    '';


  isSendingToApi =
    false;


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  currentPage =
    1;


  pageSize =
    10;


  totalItems =
    0;


  totalPages =
    0;


  // ==========================================================
  // VALIDADORES
  // ==========================================================

  public CustomValidators =
    CustomValidators;


  // ==========================================================
  // AG GRID
  // ==========================================================

  private gridApi?:
    GridApi<License>;


  /**
   * Mantiene seleccionadas licencias
   * aunque el usuario cambie de página.
   */
  selectedLicenceKeys =
    new Set<string>();


  /**
   * Selección múltiple.
   */
  rowSelection:
    'multiple' =
    'multiple';


  /**
   * Definición de columnas.
   */
  columnDefs:
    ColDef<License>[] = [

    // ========================================================
    // CHECKBOX
    // ========================================================

    {
      headerName:
        '',

      width:
        55,

      minWidth:
        55,

      maxWidth:
        55,

      // ======================================================
      // IMPORTANTE:
      // EL CHECK APARECE PARA ACTIVE E INACTIVE
      // ======================================================

      checkboxSelection:
        true,

      headerCheckboxSelection:
        true,

      sortable:
        false,

      filter:
        false,

      resizable:
        false,

      pinned:
        'left'
    },


    // ========================================================
    // DATOS
    // ========================================================

    {
      headerName:
        'License Key',

      field:
        'licenseKey',

      minWidth:
        135,

      pinned:
        'left'
    },


    {
      headerName:
        'License Type',

      field:
        'licenseType',

      minWidth:
        120
    },


    {
      headerName:
        'License Status',

      field:
        'licenseStatus',

      minWidth:
        145,

      cellClassRules: {

        'status-active-cell':
          params =>
            (
              params.value ||
              ''
            )
              .toUpperCase() ===
            'ACTIVE',

        'status-inactive-cell':
          params =>
            (
              params.value ||
              ''
            )
              .toUpperCase() ===
            'INACTIVE'
      }
    },


    {
      headerName:
        'License Name',

      field:
        'licenseName',

      minWidth:
        220
    },


    {
      headerName:
        'License GLN',

      field:
        'licenseGLN',

      minWidth:
        165
    },


    {
      headerName:
        'Address',

      field:
        'address',

      minWidth:
        320
    },


    {
      headerName:
        'Address Suburb',

      field:
        'addressSuburb',

      minWidth:
        180
    },


    {
      headerName:
        'Address Locality',

      field:
        'addressLocality',

      minWidth:
        180
    },


    {
      headerName:
        'Address Region',

      field:
        'addressRegion',

      minWidth:
        150
    },


    {
      headerName:
        'Telephone',

      field:
        'telephone',

      minWidth:
        160
    },


    {
      headerName:
        'Email',

      field:
        'email',

      minWidth:
        220
    },


    {
      headerName:
        'Website',

      field:
        'website',

      minWidth:
        250
    }
  ];


  /**
   * Configuración general de columnas.
   */
  defaultColDef:
    ColDef<License> = {

    sortable:
      true,

    filter:
      true,

    resizable:
      true,

    floatingFilter:
      false
  };


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

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


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {
  }


  // ==========================================================
  // GETTERS
  // ==========================================================

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

    if (
      this.totalItems ===
      0
    ) {

      return 0;
    }


    return (
      (
        this.currentPage -
        1
      ) *
      this.pageSize
    ) + 1;
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
      this.licencias.length >
      0
    );
  }


  get noResults():
    boolean {

    return (
      this.hasSearched &&
      this.licencias.length ===
      0 &&
      !this.isLoading
    );
  }


  get cantidadSeleccionadas():
    number {

    return this.selectedLicenceKeys
      .size;
  }


  get hayLicenciasSeleccionadas():
    boolean {

    return (
      this.selectedLicenceKeys
        .size >
      0
    );
  }


  get puedeRealizarBusqueda():
    boolean {

    const hasText =
      (
        value?: string
      ) =>

        !!value &&
        value
          .trim()
          .length >
        0;


    return (

      hasText(
        this.searchParams.ruc
      ) ||

      hasText(
        this.searchParams.prefijo
      ) ||

      hasText(
        this.searchParams.fechaIgual
      ) ||

      hasText(
        this.searchParams.fechaDesde
      ) ||

      hasText(
        this.searchParams.fechaHasta
      ) ||

      hasText(
        this.searchParams.nombreCliente
      ) ||

      hasText(
        this.searchParams.prefijoEstado
      ) ||

      hasText(
        this.searchParams.empresaEstado
      ) ||

      hasText(
        this.terminoBusquedaNombre
      )

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


  get textoBotonInactivar():
    string {

    if (
      this.isSendingToApi
    ) {

      return 'Enviando...';
    }


    return (
      `Inactivar seleccionadas ` +
      `(${this.cantidadSeleccionadas})`
    );
  }


  // ==========================================================
  // AG GRID
  // ==========================================================

  getRowId = (
    params:
      GetRowIdParams<License>
  ): string => {

    if (
      params.data
        .licenseKey
    ) {

      return params.data
        .licenseKey;
    }


    return String(
      params.data.id ??
      ''
    );
  };


  /**
   * =========================================================
   * IMPORTANTE:
   *
   * PERMITE SELECCIONAR
   * ACTIVE E INACTIVE.
   *
   * Antes aquí se bloqueaba INACTIVE.
   * =========================================================
   */
  isRowSelectable =
    (
      node:
        any
    ): boolean => {

      return true;
    };


  onGridReady(
    event:
      GridReadyEvent<License>
  ): void {

    this.gridApi =
      event.api;


    this.restaurarSeleccionPagina();
  }


  onSelectionChanged(
    event:
      SelectionChangedEvent<License>
  ): void {

    event.api
      .forEachNode(
        node => {

          const licenceKey =
            node.data
              ?.licenseKey;


          if (
            !licenceKey
          ) {

            return;
          }


          if (
            node.isSelected()
          ) {

            this.selectedLicenceKeys
              .add(
                licenceKey
              );

          }
          else {

            this.selectedLicenceKeys
              .delete(
                licenceKey
              );
          }

        }
      );
  }


  private restaurarSeleccionPagina():
    void {

    if (
      !this.gridApi
    ) {

      return;
    }


    this.gridApi
      .forEachNode(
        node => {

          const licenceKey =
            node.data
              ?.licenseKey;


          if (
            !licenceKey
          ) {

            return;
          }


          const debeEstarSeleccionado =
            this.selectedLicenceKeys
              .has(
                licenceKey
              );


          if (
            node.isSelected() !==
            debeEstarSeleccionado
          ) {

            node.setSelected(
              debeEstarSeleccionado
            );
          }

        }
      );
  }


  private limpiarSeleccion():
    void {

    this.selectedLicenceKeys
      .clear();


    if (
      this.gridApi
    ) {

      this.gridApi
        .deselectAll();
    }
  }


  // ==========================================================
  // MAPEO DE PARÁMETROS
  // ==========================================================

  private mapearParametrosBusqueda():
    ClienteLicenseQuery {

    const query:
      ClienteLicenseQuery = {

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
      this.searchParams.fechaIgual
    ) {

      query.fechaIgual =
        this.searchParams.fechaIgual;
    }


    if (
      this.searchParams.nombreCliente
    ) {

      query.nombreCliente =
        this.searchParams.nombreCliente;
    }


    if (
      this.searchParams.prefijoEstado
    ) {

      query.estadoPrefijo =
        this.searchParams
          .prefijoEstado ===
        'active';
    }


    if (
      this.searchParams.empresaEstado
    ) {

      query.estadoEmpresa =
        this.searchParams
          .empresaEstado ===
        'active'
          ? 1
          : 2;
    }


    return query;
  }


  // ==========================================================
  // MAPEAR RESPUESTA PARA GRID
  // ==========================================================

  private mapearRespuestaServicio(
    clientes:
      ClienteLicenseResponse[]
  ): License[] {

    return clientes.map(
      (
        cliente,
        index
      ) => ({

        id:
          cliente.cliente_codigo ||
          index,

        licenseKey:
          cliente.license_key ||
          'N/A',

        licenseType:
          cliente.license_type ||
          'GCP',

        licenseStatus:
          cliente.license_status ||
          'UNKNOWN',

        licenseName:
          cliente.license_name ||
          'N/A',

        licenseGLN:
          cliente.license_gln ||
          'N/A',

        address:
          cliente.address ||
          'N/A',

        addressSuburb:
          cliente.address_suburb ||
          'N/A',

        addressLocality:
          cliente.address_locality ||
          'N/A',

        addressRegion:
          cliente.address_region ||
          'N/A',

        telephone:
          cliente.telephone ||
          'N/A',

        email:
          cliente.email ||
          'N/A',

        website:
          cliente.website ||
          'N/A'

      })
    );
  }


  // ==========================================================
  // BÚSQUEDA
  // ==========================================================

  buscar(
    limpiarSeleccionBusqueda:
      boolean =
      true
  ): void {

    if (
      limpiarSeleccionBusqueda
    ) {

      this.limpiarSeleccion();
    }


    this.isLoading =
      true;


    this.hasSearched =
      true;


    this.errorMessage =
      '';


    const query =
      this.mapearParametrosBusqueda();


    this.validacionService
      .getClientesLicense(
        query
      )
      .pipe(

        catchError(
          error => {

            console.error(
              'Error al buscar licencias:',
              error
            );


            this.errorMessage =
              'Error al cargar los datos. ' +
              'Por favor, intente nuevamente.';


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
        response => {

          const r:
            any =
            response as any;


          if (
            r &&
            r.data
          ) {

            const data =
              r.data;


            this.licenciasOriginales =
              data.items ||
              [];


            this.licencias =
              this.mapearRespuestaServicio(
                this.licenciasOriginales
              );


            this.totalItems =
              data.totalItems ||
              0;


            this.totalPages =
              data.totalPages ||
              0;


            this.currentPage =
              data.page ||
              1;


            setTimeout(
              () => {

                this.restaurarSeleccionPagina();

              }
            );


            if (
              this.totalItems ===
              0
            ) {

              this.mostrarInstruccionesPopup();
            }


            return;
          }


          this.licencias =
            [];


          this.licenciasOriginales =
            [];


          this.totalItems =
            0;


          this.totalPages =
            0;


          this.errorMessage =
            r?.message ||
            'No se encontraron datos';


          this.mostrarInstruccionesPopup();
        }
      );
  }


  // ==========================================================
  // PAGINADOR
  // ==========================================================

  onPageChange(
    event:
      PageEvent
  ): void {

    this.currentPage =
      event.pageIndex +
      1;


    this.pageSize =
      event.pageSize;


    this.buscar(
      false
    );
  }


  // ==========================================================
  // NUEVA BÚSQUEDA
  // ==========================================================

  nuevaBusqueda():
    void {

    this.searchParams =
      {};


    this.terminoBusquedaNombre =
      '';


    this.limpiarSeleccion();


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


    this.licencias =
      [];


    this.licenciasOriginales =
      [];


    this.totalItems =
      0;


    this.totalPages =
      0;
  }


  // ==========================================================
  // BÚSQUEDA GENERAL
  // ==========================================================

  onBusquedaGeneralChange(
    termino:
      string
  ): void {

    this.terminoBusquedaNombre =
      termino;


    const valor =
      (
        termino ||
        ''
      )
        .trim();


    if (
      valor
    ) {

      this.searchParams
        .nombreCliente =
        valor;

    }
    else {

      this.searchParams
        .nombreCliente =
        undefined;
    }
  }


  buscarGeneral(
    termino:
      string
  ): void {

    const valor =
      (
        termino ??
        ''
      )
        .toString()
        .trim();


    this.terminoBusquedaNombre =
      valor;


    if (
      !valor
    ) {

      this.searchParams
        .nombreCliente =
        undefined;

    }
    else {

      this.searchParams
        .nombreCliente =
        valor;
    }


    this.currentPage =
      1;


    this.buscar(
      true
    );
  }


  // ==========================================================
  // EXPORTAR ESTRUCTURA COMPLETA
  // ==========================================================

  private async exportarLicencias():
    Promise<
      ExportLicenseResponse |
      null
    > {

    const exportQuery:
      ExportLicenseQuery = {

      nombreCliente:
        this.searchParams.nombreCliente,

      codigoPrefijo:
        this.searchParams.prefijo,

      fechaDesde:
        this.searchParams.fechaDesde,

      fechaHasta:
        this.searchParams.fechaHasta,

      fechaIgual:
        this.searchParams.fechaIgual,

      ruc:
        this.searchParams.ruc,

      estadoPrefijo:
        this.searchParams
          .prefijoEstado ===
        'active'
          ? true
          : this.searchParams
            .prefijoEstado ===
            'inactive'
            ? false
            : undefined,

      estadoEmpresa:
        this.searchParams
          .empresaEstado ===
        'active'
          ? 1
          : this.searchParams
            .empresaEstado ===
            'inactive'
            ? 2
            : undefined,

      batchSize:
        1000
    };


    const response =
      await firstValueFrom(

        this.validacionService
          .exportClientesLicense(
            exportQuery
          )
          .pipe(

            catchError(
              error => {

                console.error(
                  'Error al recuperar licencias:',
                  error
                );


                return of(
                  null
                );
              }
            )

          )

      );


    if (
      !response
    ) {

      return null;
    }


    const r:
      any =
      response as any;


    if (
      r.data &&
      r.type ===
      'Success'
    ) {

      return (
        r.data as
        ExportLicenseResponse
      );
    }


    throw new Error(
      r.message ||
      'Error al recuperar las licencias'
    );
  }


  // ==========================================================
  // INACTIVAR / REENVIAR SELECCIONADAS
  // ==========================================================

  async inactivarSeleccionadas():
    Promise<void> {

    // --------------------------------------------------------
    // VALIDAR SELECCIÓN
    // --------------------------------------------------------

    if (
      this.selectedLicenceKeys
        .size ===
      0
    ) {

      this.showMessageBox(

        'Información',

        'Seleccione al menos una licencia para enviar.',

        'info'

      );


      return;
    }


    const cantidad =
      this.selectedLicenceKeys
        .size;


    // --------------------------------------------------------
    // CONFIRMACIÓN
    // --------------------------------------------------------

    const confirmado =
      await this.showConfirmDialog(

        'Confirmar envío',

        `Se enviarán ${cantidad} licencia(s) a GS1 Verified con estado INACTIVE.

Se permite seleccionar licencias ACTIVE e INACTIVE.

¿Desea continuar?`,

        'warning',

        'Sí, enviar',

        'Cancelar'

      );


    if (
      confirmado !==
      true
    ) {

      return;
    }


    this.isSendingToApi =
      true;


    try {

      // ------------------------------------------------------
      // RECUPERAR ESTRUCTURA COMPLETA
      // ------------------------------------------------------

      const exportData =
        await this.exportarLicencias();


      if (
        !exportData
      ) {

        throw new Error(
          'No fue posible recuperar las licencias.'
        );
      }


      // ------------------------------------------------------
      // UNIR LOTES
      // ------------------------------------------------------

      const todasLasLicencias:
        ExportLicenseItem[] =
        [];


      for (
        const batch of
        exportData.batches
      ) {

        todasLasLicencias
          .push(
            ...batch.items
          );
      }


      // ------------------------------------------------------
      // FILTRAR SOLO SELECCIONADAS
      // ------------------------------------------------------

      const seleccionadas =
        todasLasLicencias
          .filter(
            item => {

              const licenceKey =
                (
                  (item as any)
                    .licenceKey ||
                  ''
                )
                  .toString();


              return (
                this.selectedLicenceKeys
                  .has(
                    licenceKey
                  )
              );
            }
          );


      // ------------------------------------------------------
      // CONTROL CRÍTICO
      // ------------------------------------------------------

      if (
        seleccionadas.length !==
        cantidad
      ) {

        throw new Error(

          `Se seleccionaron ${cantidad} licencia(s), ` +

          `pero solamente se recuperaron ` +

          `${seleccionadas.length}. ` +

          `No se realizará el envío para evitar ` +

          `una actualización parcial.`

        );
      }


      // ------------------------------------------------------
      // FORZAR ESTADO INACTIVE
      // ------------------------------------------------------

      const licenciasInactivar:
        ExportLicenseItem[] =

        seleccionadas.map(
          item => ({

            ...item,

            licenceStatus:
              'INACTIVE'

          } as ExportLicenseItem)
        );


      // ------------------------------------------------------
      // SANITIZAR
      // ------------------------------------------------------

      const payload =
        this.sanitizeLicensesForVerified(
          licenciasInactivar
        );


      console.log(
        '======================================'
      );

      console.log(
        'LICENCIAS ENVIADAS A VERIFIED'
      );

      console.log(
        payload
      );

      console.log(
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      console.log(
        '======================================'
      );


      // ------------------------------------------------------
      // ENVIAR
      // ------------------------------------------------------

      const result =
        await this.enviarLoteAApi(
          payload
        );


      // ------------------------------------------------------
      // EVALUAR RESPUESTA
      // ------------------------------------------------------

      if (
        !result?.success
      ) {

        throw new Error(
          result?.message ||
          'GS1 rechazó la solicitud.'
        );
      }


      // ------------------------------------------------------
      // INFORMACIÓN EXTERNA
      // ------------------------------------------------------

      const requestId =
        result?.requestId ||
        '';


      const externalStatusCode =
        result?.externalStatusCode ||
        '';


      const externalStatus =
        result?.externalStatus ||
        '';


      let mensaje =
        `La solicitud fue enviada correctamente a GS1 Verified.

Licencias enviadas: ${payload.length}`;


      if (
        externalStatusCode
      ) {

        mensaje +=
          `\nHTTP GS1: ${externalStatusCode}`;
      }


      if (
        externalStatus
      ) {

        mensaje +=
          ` ${externalStatus}`;
      }


      if (
        requestId
      ) {

        mensaje +=
          `\nRequest ID: ${requestId}`;
      }


      mensaje +=
        `

Importante:
La solicitud fue recibida por GS1. Se envió licenceStatus = INACTIVE tanto para licencias ACTIVE como para licencias que ya estaban INACTIVE localmente.`;


      this.showMessageBox(

        'Solicitud enviada',

        mensaje,

        'success'

      );


      // ------------------------------------------------------
      // LIMPIAR SELECCIÓN
      // ------------------------------------------------------

      this.limpiarSeleccion();

    }
    catch (
      error:
        any
    ) {

      console.error(
        'Error al enviar licencias:',
        error
      );


      this.showMessageBox(

        'Error',

        error?.message ||
        'No fue posible enviar las licencias.',

        'error'

      );

    }
    finally {

      this.isSendingToApi =
        false;
    }
  }


  // ==========================================================
  // ENVIAR A API
  // ==========================================================

  private async enviarLoteAApi(
    licencias:
      ExportLicenseItem[]
  ): Promise<any> {

    const response =
      await firstValueFrom(

        this.validacionService
          .inactivarLicenciasVerified(
            licencias
          )
          .pipe(

            catchError(
              error => {

                throw error;
              }
            )

          )

      );


    return response;
  }


  // ==========================================================
  // POPUP INSTRUCCIONES
  // ==========================================================

  private mostrarInstruccionesPopup():
    void {

    const instrucciones = [

      '<strong>Enviar Licencias a Verified</strong>',

      '',

      'Utilice los filtros para buscar las licencias.',

      '',

      '<strong>Proceso:</strong>',

      '• Busque una empresa o grupo de empresas',

      '• Puede seleccionar licencias ACTIVE o INACTIVE',

      '• Presione "Inactivar seleccionadas"',

      '• Confirme la operación',

      '• El sistema enviará licenceStatus = INACTIVE a GS1 Verified'

    ];


    this.requiredFieldsToast
      .info(

        instrucciones.join(
          '<br>'
        ),

        'Instrucciones'

      );
  }


  // ==========================================================
  // MENSAJES
  // ==========================================================

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
          '480px'

      }
    );
  }


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
            '500px',

          disableClose:
            false
        }
      );


    return await firstValueFrom(
      dialogRef
        .afterClosed()
    );
  }


  // ==========================================================
  // WEBSITE
  // ==========================================================

  getWebsiteUrl(
    website:
      string
  ): string {

    if (
      !website
    ) {

      return '';
    }


    const value =
      website
        .toString()
        .trim();


    if (
      !value ||
      value
        .toUpperCase() ===
      'N/A'
    ) {

      return '';
    }


    if (
      /^https?:\/\//i
        .test(
          value
        )
    ) {

      return value;
    }


    return `https://${value}`;
  }


  // ==========================================================
  // VERIFIED - PROVINCIAS
  // ==========================================================

  private readonly provinciasISO:
    Record<
      string,
      string
    > = {

      'AZUAY':
        'EC-A',

      'BOLIVAR':
        'EC-B',

      'CANAR':
        'EC-F',

      'CARCHI':
        'EC-C',

      'CHIMBORAZO':
        'EC-H',

      'COTOPAXI':
        'EC-X',

      'EL ORO':
        'EC-O',

      'ESMERALDAS':
        'EC-E',

      'GALAPAGOS':
        'EC-W',

      'GUAYAS':
        'EC-G',

      'IMBABURA':
        'EC-I',

      'LOJA':
        'EC-L',

      'LOS RIOS':
        'EC-R',

      'MANABI':
        'EC-M',

      'MORONA SANTIAGO':
        'EC-S',

      'NAPO':
        'EC-N',

      'ORELLANA':
        'EC-D',

      'PASTAZA':
        'EC-Y',

      'PICHINCHA':
        'EC-P',

      'SANTA ELENA':
        'EC-SE',

      'SANTO DOMINGO DE LOS TSACHILAS':
        'EC-SD',

      'SUCUMBIOS':
        'EC-U',

      'TUNGURAHUA':
        'EC-T',

      'ZAMORA CHINCHIPE':
        'EC-Z'
    };


  // ==========================================================
  // NORMALIZACIONES
  // ==========================================================

  private normalizeText(
    value:
      string
  ): string {

    return (
      value ||
      ''
    )
      .trim()
      .toUpperCase()
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /Ñ/g,
        'N'
      )
      .replace(
        /\s+/g,
        ' '
      );
  }


  private getSubdivisionCode(
    provincia:
      string
  ): string {

    const key =
      this.normalizeText(
        provincia
      );


    return (
      this.provinciasISO[
        key
      ] ||
      ''
    );
  }


  private onlyDigits(
    value:
      string
  ): string {

    return (
      value ||
      ''
    )
      .replace(
        /\D+/g,
        ''
      );
  }


  private normalizeWebsite(
    website?:
      string
  ): string |
    undefined {

    const value =
      (
        website ??
        ''
      )
        .toString()
        .trim();


    if (
      !value
    ) {

      return undefined;
    }


    if (
      value
        .toUpperCase() ===
      'N/A'
    ) {

      return undefined;
    }


    if (
      /^https?:\/\//i
        .test(
          value
        )
    ) {

      return value;
    }


    return `https://${value}`;
  }


  // ==========================================================
  // TELÉFONO
  // ==========================================================

  private normalizeTelephone(
    telephone?:
      string
  ): string |
    undefined {

    let tel =
      (
        telephone ??
        ''
      )
        .toString()
        .trim();


    if (
      !tel
    ) {

      return undefined;
    }


    const upper =
      tel
        .toUpperCase();


    if (

      upper ===
      'N/A' ||

      upper ===
      'NULL' ||

      upper ===
      'UNDEFINED'

    ) {

      return undefined;
    }


    tel =
      tel.replace(
        /[^\d+]/g,
        ''
      );


    tel =
      tel.replace(
        /\+/g,
        ''
      );


    if (
      tel.startsWith(
        '593'
      )
    ) {

      tel =
        `+${tel}`;
    }
    else if (
      tel.startsWith(
        '0'
      )
    ) {

      tel =
        `+593${tel.substring(1)}`;
    }
    else {

      tel =
        `+${tel}`;
    }


    return tel;
  }


  // ==========================================================
  // CONTACT POINT
  // ==========================================================

  private sanitizeContactPoint(
    cp:
      any[] |
      undefined
  ): Array<{
    email?: string;
    telephone?: string;
    website?: string;
  }> {

    const list =
      Array.isArray(
        cp
      )
        ? cp
        : [];


    const isBad =
      (
        value:
          any
      ): boolean => {

        const text =
          (
            value ??
            ''
          )
            .toString()
            .trim();


        if (
          !text
        ) {

          return true;
        }


        const upper =
          text
            .toUpperCase();


        return (

          upper ===
          'N/A' ||

          upper ===
          'NULL' ||

          upper ===
          'UNDEFINED'

        );
      };


    let email:
      string |
      undefined;


    let telephone:
      string |
      undefined;


    let website:
      string |
      undefined;


    for (
      const item of
      list
    ) {

      if (
        !email &&
        !isBad(
          item?.email
        )
      ) {

        email =
          item.email
            .toString()
            .trim();
      }


      if (
        !telephone &&
        !isBad(
          item?.telephone
        )
      ) {

        telephone =
          this.normalizeTelephone(
            item.telephone
              .toString()
          );
      }


      if (
        !website &&
        !isBad(
          item?.website
        )
      ) {

        website =
          item.website
            .toString()
            .trim();
      }


      if (
        email &&
        telephone &&
        website
      ) {

        break;
      }
    }


    website =
      this.normalizeWebsite(
        website
      );


    const contactPoint: {
      email?: string;
      telephone?: string;
      website?: string;
    } = {};


    if (
      email
    ) {

      contactPoint.email =
        email;
    }


    if (
      telephone
    ) {

      contactPoint.telephone =
        telephone;
    }


    if (
      website
    ) {

      contactPoint.website =
        website;
    }


    return (
      Object.keys(
        contactPoint
      )
        .length >
      0
        ? [
          contactPoint
        ]
        : []
    );
  }


  // ==========================================================
  // SANITIZAR LICENCIAS
  // ==========================================================

  private sanitizeLicensesForVerified(
    items:
      ExportLicenseItem[]
  ): ExportLicenseItem[] {

    return (
      items ??
      []
    )
      .map(
        item => {

          const it:
            any =
            item as any;


          const address:
            any =
            it?.address ??
            {};


          const isBad =
            (
              value:
                any
            ): boolean => {

              const text =
                (
                  value ??
                  ''
                )
                  .toString()
                  .trim();


              if (
                !text
              ) {

                return true;
              }


              const upper =
                text
                  .toUpperCase();


              return (

                upper ===
                'N/A' ||

                upper ===
                'NULL' ||

                upper ===
                'UNDEFINED'

              );
            };


          // ------------------------------------------------------
          // POSTAL NAME
          // ------------------------------------------------------

          const postalNameValue =
            (
              address
                ?.postalName
                ?.value ??
              ''
            )
              .toString()
              .trim();


          const licenseeName =
            (
              it
                ?.licenseeName ??
              ''
            )
              .toString()
              .trim();


          const fixedPostalNameValue =

            postalNameValue ||

            licenseeName ||

            'N/A';


          // ------------------------------------------------------
          // POSTAL CODE
          // ------------------------------------------------------

          const postalRaw =
            (
              address
                ?.postalCode ??
              ''
            )
              .toString()
              .trim();


          const postalDigits =
            this.onlyDigits(
              postalRaw
            );


          const fixedPostalCode =

            postalDigits.length >
            0

              ? postalDigits

              : '000000';


          // ------------------------------------------------------
          // SUBDIVISION
          // ------------------------------------------------------

          const region =
            (
              address
                ?.addressRegion
                ?.value ??
              ''
            )
              .toString()
              .trim();


          const existingSubdiv =
            (
              address
                ?.countrySubdivisionCode ??
              ''
            )
              .toString()
              .trim();


          const fixedSubdiv =

            existingSubdiv ||

            this.getSubdivisionCode(
              region
            ) ||

            '';


          // ------------------------------------------------------
          // POST OFFICE BOX
          // ------------------------------------------------------

          const pobRaw =
            (
              address
                ?.postOfficeBoxNumber ??
              ''
            )
              .toString()
              .trim();


          const fixedPob =

            !isBad(
              pobRaw
            )

              ? pobRaw

              : fixedPostalCode;


          // ------------------------------------------------------
          // CONTACT POINT
          // ------------------------------------------------------

          const fixedContactPoint =
            this.sanitizeContactPoint(
              it?.contactPoint
            );


          // ------------------------------------------------------
          // ADDRESS NUEVO
          // ------------------------------------------------------

          const newAddress:
            any = {

            ...address,

            postalName: {

              language:
                (
                  address
                    ?.postalName
                    ?.language ??
                  'es'
                )
                  .toString()
                  .trim() ||
                'es',

              value:
                fixedPostalNameValue
            },

            postalCode:
              fixedPostalCode,

            countrySubdivisionCode:
              fixedSubdiv,

            postOfficeBoxNumber:
              fixedPob
          };


          // ------------------------------------------------------
          // OBJETO FINAL
          // ------------------------------------------------------

          return {

            ...item,

            // Seguridad adicional:
            // incluso después de sanitizar
            // mantenemos INACTIVE.
            licenceStatus:
              'INACTIVE',

            address:
              newAddress,

            contactPoint:
              fixedContactPoint

          } as ExportLicenseItem;

        }
      );
  }


  // ==========================================================
  // AUDITORÍA
  // ==========================================================

  abrirAuditoria():
    void {

    this.dialog.open(

      AuditoriaLicenciasVerifiedComponent,

      {

        width:
          '95vw',

        maxWidth:
          '95vw',

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