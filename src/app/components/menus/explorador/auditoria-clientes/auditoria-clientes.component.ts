import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  AgGridModule
} from 'ag-grid-angular';

import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  ClienteService,AuditoriaDatosAdicionalesClienteResponse
} from 'src/app/services/cliente.service';


  

@Component({

  selector:
    'app-auditoria-clientes',

  standalone:
    true,

  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    AgGridModule
  ],

  templateUrl:
    './auditoria-clientes.component.html',

  styleUrls: [
    './auditoria-clientes.component.css'
  ]

})
export class AuditoriaClientesComponent
  implements OnInit {

  // ==========================================================
  // GRID
  // ==========================================================

  private gridApi?: GridApi;

  rowData:
    AuditoriaDatosAdicionalesClienteResponse[] = [];


  // ==========================================================
  // ESTADOS
  // ==========================================================

  isLoading =
    false;

  errorMessage =
    '';


  // ==========================================================
  // TOTAL
  // ==========================================================

  get totalRegistros():
    number {

    return (
      this.rowData?.length ||
      0
    );
  }


  // ==========================================================
  // DEFAULT COLUMN
  // ==========================================================

  defaultColDef:
    ColDef = {

    sortable:
      true,

    filter:
      true,

    resizable:
      true,

    floatingFilter:
      true
  };


  // ==========================================================
  // COLUMNAS
  // ==========================================================

  columnDefs:
    ColDef<
      AuditoriaDatosAdicionalesClienteResponse
    >[] = [

    {
      headerName:
        'ID',

      field:
        'idAuditoria',

      width:
        85,

      minWidth:
        85,

      maxWidth:
        85,

      pinned:
        'left'
    },


    {
      headerName:
        'Código',

      field:
        'clientesCodigo',

      width:
        110,

      minWidth:
        110,

      pinned:
        'left'
    },


    {
      headerName:
        'Cliente',

      field:
        'nombreCliente',

      minWidth:
        300,

      flex:
        1,

      pinned:
        'left',

      cellClass:
        'cell-cliente'
    },


    {
      headerName:
        'Campo',

      field:
        'campo',

      width:
        125,

      minWidth:
        125,

      cellClassRules: {

        'cell-campo-prefijo':
          params =>
            String(
              params.value || ''
            )
              .toUpperCase() ===
            'PREFIJO',

        'cell-campo-guia':
          params =>
            String(
              params.value || ''
            )
              .toUpperCase() ===
            'O.COMPRA',

        'cell-campo-otros':
          params =>
            String(
              params.value || ''
            )
              .toUpperCase() ===
            'OTROS'
      }
    },


    {
      headerName:
        'Valor Anterior', hide: true,

      field:
        'valorAnterior',

      width:
        145,

      minWidth:
        145,

      cellClass:
        'cell-center',

      valueFormatter:
        params => {

          return params.value === true
            ? 'SI'
            : 'NO';
        }
    },


    {
      headerName:
        'Valor Nuevo',hide: true,

      field:
        'valorNuevo',

      width:
        135,

      minWidth:
        135,

      cellClass:
        'cell-center',

      valueFormatter:
        params => {

          return params.value === true
            ? 'SI'
            : 'NO';
        },

      cellClassRules: {

        'cell-si':
          params =>
            params.value ===
            true,

        'cell-no':
          params =>
            params.value ===
            false
      }
    },


    {
      headerName:
        'Usuario',hide: false,

      field:
        'usuario',

      width:
        110,

      minWidth:
        110,

      cellClass:
        'cell-center',

      valueFormatter:
        params => {

          if (
            params.value ===
              null ||
            params.value ===
              undefined
          ) {

            return 'SISTEMA';
          }

          return String(
            params.value
          );
        }
    },


    {
      headerName:
        'Fecha',

      field:
        'fecha',

      width:
        190,

      minWidth:
        190,

      sort:
        'desc',

      valueFormatter:
        params => {

          if (
            !params.value
          ) {
            return '';
          }


          const fecha =
            new Date(
              params.value
            );


          if (
            isNaN(
              fecha.getTime()
            )
          ) {

            return String(
              params.value
            );
          }


          return fecha
            .toLocaleString(
              'es-EC',
              {
                day:
                  '2-digit',

                month:
                  '2-digit',

                year:
                  'numeric',

                hour:
                  '2-digit',

                minute:
                  '2-digit',

                second:
                  '2-digit'
              }
            );
        }
    }
  ];


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(

    private clienteService:
      ClienteService,

    private dialogRef:
      MatDialogRef<
        AuditoriaClientesComponent
      >

  ) {
  }


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {

    this.cargarAuditoria();
  }


  // ==========================================================
  // GRID READY
  // ==========================================================

  onGridReady(
    event:
      GridReadyEvent
  ): void {

    this.gridApi =
      event.api;


    this.gridApi
      .sizeColumnsToFit();
  }


  // ==========================================================
  // CARGAR AUDITORÍA
  // ==========================================================

  cargarAuditoria():
    void {

    if (
      this.isLoading
    ) {
      return;
    }


    this.isLoading =
      true;

    this.errorMessage =
      '';


    this.clienteService
      .getAuditoriaDatosAdicionalesCliente()
      .subscribe({

        next:
          response => {

            this.rowData =
              response?.data ||
              [];


            this.isLoading =
              false;


            setTimeout(
              () => {

                if (
                  this.gridApi
                ) {

                  this.gridApi
                    .sizeColumnsToFit();

                }

              },
              100
            );
          },


        error:
          error => {

            console.error(
              'Error consultando auditoría:',
              error
            );


            this.rowData =
              [];


            this.errorMessage =
              error?.error
                ?.message ||
              'No fue posible cargar la auditoría.';


            this.isLoading =
              false;
          }

      });
  }


  // ==========================================================
  // CERRAR
  // ==========================================================

  cerrar():
    void {

    this.dialogRef
      .close();
  }
}