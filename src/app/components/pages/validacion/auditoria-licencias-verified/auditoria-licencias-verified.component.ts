import {
  Component,
  OnInit
} from '@angular/core';

import {
  MatDialogRef
} from '@angular/material/dialog';

import {
  ColDef
} from 'ag-grid-community';

import {
  ValidacionService,
  AuditoriaLicenciaVerifiedResponse
} from 'src/app/services/validacion.service';


@Component({
  selector: 'app-auditoria-licencias-verified',

  templateUrl:
    './auditoria-licencias-verified.component.html',

  styleUrls: [
    './auditoria-licencias-verified.component.css'
  ]
})
export class AuditoriaLicenciasVerifiedComponent
  implements OnInit {

  // ==========================================================
  // ESTADOS
  // ==========================================================

  isLoading = false;

  errorMessage = '';


  // ==========================================================
  // DATOS
  // ==========================================================

  rowData:
    AuditoriaLicenciaVerifiedResponse[] = [];


  // ==========================================================
  // CONFIGURACIÓN GENERAL AG GRID
  // ==========================================================

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };


  // ==========================================================
  // COLUMNAS AG GRID
  // ==========================================================

  columnDefs:
    ColDef<AuditoriaLicenciaVerifiedResponse>[] = [

    {
      headerName: 'ID',
      field: 'idAuditoria',
      width: 85,
      pinned: 'left'
    },

    {
      headerName: 'Licence Key',
      field: 'licenceKey',
      minWidth: 140,
      pinned: 'left',
      cellClass: 'cell-license-key-bold'
    },

    {
      headerName: 'Tipo',
      field: 'licenceType',
      width: 100
    },

    {
      headerName: 'Código Cliente',
      field: 'clientesCodigo',
      minWidth: 130
    },

    {
      headerName: 'Empresa',
      field: 'licenseeName',
      minWidth: 230
    },

    {
      headerName: 'GLN',
      field: 'licenseeGln',
      minWidth: 160
    },

    {
      headerName: 'Estado Anterior',
      field: 'estadoAnterior',
      minWidth: 135,

      cellClassRules: {

        'cell-status-active':
          params =>
            (params.value || '')
              .toString()
              .toUpperCase() === 'ACTIVE',

        'cell-status-inactive':
          params =>
            (params.value || '')
              .toString()
              .toUpperCase() === 'INACTIVE'

      }
    },

    {
      headerName: 'Estado Nuevo',
      field: 'estadoNuevo',
      minWidth: 130,

      cellClassRules: {

        'cell-status-active':
          params =>
            (params.value || '')
              .toString()
              .toUpperCase() === 'ACTIVE',

        'cell-status-inactive':
          params =>
            (params.value || '')
              .toString()
              .toUpperCase() === 'INACTIVE'

      }
    },

    {
      headerName: 'Estado Empresa Antes',
      field: 'idEstadoEmpresaAntes',
      minWidth: 155,hide:true
    },

    {
      headerName: 'Estado Empresa Nuevo',
      field: 'idEstadoEmpresaNuevo',
      minWidth: 160,hide:true
    },

    {
      headerName: 'HTTP GS1',
      field: 'gs1HttpStatus',
      width: 105,hide:true
    },

    {
      headerName: 'Estado GS1',
      field: 'gs1Status',
      minWidth: 120,hide:true
    },

    {
      headerName: 'Request ID',
      field: 'gs1RequestId',
      minWidth: 290,hide:true
    },

    {
      headerName: 'Actualización Local',
      field: 'actualizacionLocalOk',hide:true,
      minWidth: 150,

      valueFormatter: params => {

        if (
          params.value === true
        ) {
          return 'Sí';
        }

        if (
          params.value === false
        ) {
          return 'No';
        }

        return '';
      },

      cellClassRules: {

        'cell-update-ok':
          params =>
            params.value === true,

        'cell-update-error':
          params =>
            params.value === false

      }
    },

    {
      headerName: 'Usuario',
      field: 'usuario',hide:true,
      minWidth: 130
    },

    {
      headerName: 'Fecha',
      field: 'fecha',
      minWidth: 180,

      valueFormatter: params => {

        if (!params.value) {
          return '';
        }

        try {

          return new Date(
            params.value
          ).toLocaleString();

        }
        catch {

          return params.value
            .toString();

        }
      }
    },

    {
      headerName: 'Error',hide:true,
      field: 'error',
      minWidth: 300
    },

    {
      headerName: 'Respuesta GS1',
      field: 'gs1Response',hide:true, 
      minWidth: 350
    }
  ];


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(

    private validacionService:
      ValidacionService,

    private dialogRef:
      MatDialogRef<
        AuditoriaLicenciasVerifiedComponent
      >

  ) {
  }


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.cargarAuditoria();
  }


  // ==========================================================
  // CARGAR AUDITORÍA
  // ==========================================================

  cargarAuditoria(): void {

    if (this.isLoading) {
      return;
    }


    this.isLoading = true;

    this.errorMessage = '';


    this.validacionService
      .getAuditoriaLicenciasVerified()
      .subscribe({

        next: response => {

          this.rowData =
            response?.data || [];

          this.isLoading =
            false;
        },


        error: error => {

          console.error(
            'Error al consultar auditoría de licencias:',
            error
          );


          this.rowData = [];


          this.errorMessage =
            error?.error?.message ||
            'No fue posible cargar la auditoría.';


          this.isLoading =
            false;
        }

      });
  }


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  cerrar(): void {

    this.dialogRef.close();
  }
}