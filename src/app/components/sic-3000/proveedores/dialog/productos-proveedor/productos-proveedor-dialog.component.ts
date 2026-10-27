// src/app/pages/proveedores/productos-proveedor-dialog/productos-proveedor-dialog.component.ts

import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { ProductoProveedorResponse } from 'src/app/interfaces/responses/producto-proveedor-response';
import { ProveedorResponse } from 'src/app/interfaces/responses/proveedor-response';
import { ProductoProveedorService } from 'src/app/services/producto-proveedor.service';

@Component({
  selector: 'app-productos-proveedor-dialog',
  templateUrl: './productos-proveedor-dialog.component.html',
  styleUrls: ['./productos-proveedor-dialog.component.css']
})
export class ProductosProveedorDialogComponent implements OnInit {
  private readonly productoProveedorService = inject(ProductoProveedorService);
  private gridApi!: GridApi;

  proveedor: ProveedorResponse;
  productos: ProductoProveedorResponse[] = [];
  isLoading: boolean = false;

  columnDefs: ColDef[] = [
    { 
      headerName: '#', 
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      sortable: false,
      filter: false
    },
    { 
      headerName: 'Código', 
      field: 'codigo_producto',
      width: 120,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Nombre Producto', 
      field: 'nombre_producto',
      width: 300,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Descripción', 
      field: 'descripcion_producto',
      width: 250,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Precio Compra', 
      field: 'precio_compra',
      width: 130,
      sortable: true,
      filter: true,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '-'
    },
    { 
      headerName: 'Precio Venta', 
      field: 'precio_venta',
      width: 130,
      sortable: true,
      filter: true,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '-'
    },
    { 
      headerName: 'Stock Mínimo', 
      field: 'stock_minimo',
      width: 120,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Tiempo Entrega', 
      field: 'tiempo_entrega',
      width: 140,
      sortable: true,
      filter: true,
      valueFormatter: (params) => params.value ? `${params.value} días` : '-'
    },
    { 
      headerName: 'Principal', 
      field: 'es_principal',
      width: 100,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        return params.value ? 
          '<span class="badge badge-primary">Sí</span>' : 
          '<span class="badge badge-secondary">No</span>';
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  };

  constructor(
    public dialogRef: MatDialogRef<ProductosProveedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { proveedor: ProveedorResponse}
  ) {
    this.proveedor = data.proveedor;
  }

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.isLoading = true;
    
    this.productoProveedorService.getProductosByProveedor(this.proveedor.id_proveedor).subscribe({
      next: (response) => {
        if (response.type === 'SUCCESS') {
          this.productos = response.data;
        } else {
          console.error('Error en respuesta:', response.message);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}