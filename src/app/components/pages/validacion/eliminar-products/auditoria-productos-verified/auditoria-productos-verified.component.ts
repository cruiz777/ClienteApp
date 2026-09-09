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
  ValidacionService,
  AuditoriaProductoVerifiedResponse
} from 'src/app/services/validacion.service';


@Component({
  selector: 'app-auditoria-productos-verified',

  standalone: true,

  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    AgGridModule
  ],

  templateUrl:
    './auditoria-productos-verified.component.html',

  styleUrls: [
    './auditoria-productos-verified.component.css'
  ]
})
export class AuditoriaProductosVerifiedComponent
  implements OnInit {

  private gridApi?: GridApi;

  rowData:
    AuditoriaProductoVerifiedResponse[] = [];

  isLoading = false;

  errorMessage = '';


  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };


  columnDefs:
    ColDef<AuditoriaProductoVerifiedResponse>[] = [

    {
      headerName: 'ID',
      field: 'idAuditoria',
      width: 80,
      pinned: 'left'
    },

    {
      headerName: 'Fecha',
      field: 'fecha',
      minWidth: 180,

      valueFormatter: params => {

        if (!params.value) {
          return '';
        }

        const fecha =
          new Date(params.value);

        if (isNaN(fecha.getTime())) {
          return String(params.value);
        }

        return fecha.toLocaleString(
          'es-EC'
        );
      }
    },

    {
      headerName: 'Cliente',
      field: 'nombreCliente',
      minWidth: 260,
      pinned: 'left',
      cellClass: 'cell-cliente'
    },

    {
      headerName: 'GTIN',
      field: 'gtin',
      minWidth: 150,
      cellClass: 'cell-gtin'
    },

    {
      headerName: 'Prefijo',
      field: 'codigoPrefijo',
      minWidth: 130
    },

    {
      headerName: 'Licence Key',
      field: 'licenceKey',
      minWidth: 140
    },

    {
      headerName: 'Marca',
      field: 'brandName',hide: true,
      minWidth: 180
    },

    {
      headerName: 'Descripción',
      field: 'productDescription',
      minWidth: 320,
      wrapText: true,
      autoHeight: true
    },

    {
      headerName: 'Estado anterior',hide: true,
      field: 'gtinStatusAnterior',
      minWidth: 140,

      cellClassRules: {
        'cell-status-active':
          params =>
            String(params.value || '')
              .toUpperCase() === 'ACTIVE',

        'cell-status-inactive':
          params =>
            String(params.value || '')
              .toUpperCase() === 'INACTIVE'
      }
    },

    {
      headerName: 'Acción',hide: true,
      field: 'accion',
      width: 120,
      cellClass: 'cell-accion'
    },

    {
      headerName: 'Usuario',hide: true,
      field: 'idUsuario',
      width: 110,

      valueFormatter: params => {

        if (
          params.value === null ||
          params.value === undefined
        ) {
          return 'SISTEMA';
        }

        return String(
          params.value
        );
      }
    }
  ];


  constructor(
    private validacionService:
      ValidacionService,

    private dialogRef:
      MatDialogRef<AuditoriaProductosVerifiedComponent>
  ) {
  }


  ngOnInit(): void {

    this.cargarAuditoria();
  }


  onGridReady(
    event: GridReadyEvent
  ): void {

    this.gridApi =
      event.api;

    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }


  cargarAuditoria(): void {

    if (this.isLoading) {
      return;
    }

    this.isLoading =
      true;

    this.errorMessage =
      '';


    this.validacionService
      .getAuditoriaProductosEliminados()
      .subscribe({

        next: response => {

          this.rowData =
            response?.data || [];

          this.isLoading =
            false;

          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
          }, 100);
        },

        error: error => {

          console.error(
            'Error consultando auditoría de productos:',
            error
          );

          this.rowData =
            [];

          this.errorMessage =
            error?.error?.message ||
            'No fue posible cargar la auditoría de productos.';

          this.isLoading =
            false;
        }

      });
  }


  cerrar(): void {

    this.dialogRef.close();
  }
}