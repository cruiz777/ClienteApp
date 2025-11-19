import { Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { ProveedorDialogComponent } from './dialog/proveedor-dialog.component';
import { ProveedorResponse } from 'src/app/interfaces/responses/proveedor-response';
import { ProveedorService } from 'src/app/services/proveedor.service';
import { TipoProveedorService } from 'src/app/services/tipo-proveedor.service';
import { TipoProveedorResponse } from 'src/app/interfaces/responses/tipo-proveedor-response';
import { ProductosProveedorDialogComponent } from './dialog/productos-proveedor/productos-proveedor-dialog.component';
import { CustomMessageBoxComponent } from '../../utils/messages/custom-message-box.component';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.css']
})
export class ProveedoresListaComponent implements OnInit {
  // Servicios
  private readonly proveedorService = inject(ProveedorService);
  private readonly tipoProveedorService = inject(TipoProveedorService);
  private readonly dialog = inject(MatDialog);
  //Variable de filtro
  filtroEstado: string = 'activos'; 
  // AG-Grid
  private gridApi!: GridApi;
  rowData: ProveedorResponse[] = [];
  
  columnDefs: ColDef[] = [
    { 
      headerName: '#', 
      valueGetter: 'node.rowIndex + 1',
      width: 40,
      sortable: false,
      filter: false,
      pinned: 'left'
    },
    { 
      headerName: 'Acción', 
      cellRenderer: this.accionesRenderer.bind(this),
      width: 150,
      sortable: false,
      filter: false,
      pinned: 'left'
    },
    { 
      headerName: 'Código', 
      field: 'codigo_proveedor',
      width: 120,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'RUC', 
      field: 'ruc_prov',
      width: 150,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Nombre', 
      field: 'nombre_prov',
      width: 300,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Nombre Comercial', 
      field: 'nombre_comercial',
      width: 250,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Email', 
      field: 'email_prov',
      width: 200,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Teléfono', 
      field: 'telefono_prov',
      width: 130,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Ciudad', 
      field: 'ciudad',
      width: 150,
      sortable: true,
      filter: true
    },
    { 
      headerName: 'Tipo', 
      field: 'tipo_proveedor',
      width: 150,
      sortable: true,
      filter: true
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  };

  // Filtros
  filtroBusqueda: string = '';
  filtroLista: string = '';
  filtroTipoProveedor: number | string = '';
  // Paginación
  pageSize: number = 20;
  currentPage: number = 1;
  totalItems: number = 0;
  totalPages: number = 0;
  isLoading: boolean = false;

  // Tipos de proveedor para el menú
  tiposProveedor: TipoProveedorResponse[] = [];
  isLoadingTipos: boolean = false;

  ngOnInit(): void {
    this.cargarTiposProveedor();
    this.cargarDatos();
  }

  // Cargar tipos de proveedor para el menú
  cargarTiposProveedor(): void {
    this.isLoadingTipos = true;
    this.tipoProveedorService.getAll().subscribe({
      next: (response) => {
        if (response.type === 'SUCCESS') {
          this.tiposProveedor = response.data;
        }
        this.isLoadingTipos = false;
      },
      error: (error) => {
        console.error('Error al cargar tipos de proveedor:', error);
        this.isLoadingTipos = false;
      }
    });
  }

// Cargar datos desde el backend
cargarDatos(): void {
  this.isLoading = true;
  
  const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
    width: '350px',
    disableClose: true,
    data: {
      title: 'Cargando',
      message: 'Obteniendo lista de proveedores...',
      type: 'info',
      isLoading: true,
      loadingText: 'Por favor espere'
    }
  });
  
  const page = isNaN(this.currentPage) || this.currentPage < 1 ? 1 : this.currentPage;
  const size = isNaN(this.pageSize) || this.pageSize < 1 ? 20 : this.pageSize;
  
  // ← CONVERTIR filtroEstado a boolean o undefined
  let activoParam: boolean | undefined;
  if (this.filtroEstado === 'activos') activoParam = true;
  else if (this.filtroEstado === 'inactivos') activoParam = false;
  else activoParam = undefined;  // 'todos'
  
  this.proveedorService.getAll(
    page,
    size,
    this.filtroBusqueda || undefined,
    'nombre',
    false,
    this.filtroTipoProveedor ? Number(this.filtroTipoProveedor) : undefined,
    activoParam  // ← AGREGAR
  ).subscribe({
    next: (response) => {
      this.rowData = response.items;
      this.totalItems = response.totalItems;
      this.totalPages = response.totalPages;
      this.isLoading = false;
      loadingDialog.close();
    },
    error: (error) => {
      console.error('Error al cargar proveedores:', error);
      this.isLoading = false;
      loadingDialog.close();
      
      this.dialog.open(CustomMessageBoxComponent, {
        width: '350px',
        data: {
          title: 'Error',
          message: 'No se pudo cargar la lista de proveedores.',
          type: 'error',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
    }
  });
}

    // Renderer personalizado para botones de acción
  accionesRenderer(params: any): string {
    return `
        <div class="acciones-cell" style="display: flex; gap: 6px; align-items: center; justify-content: center;">
        <button class="btn-accion btn-editar" data-action="editar" data-id="${params.data.id_proveedor}" title="Editar">
            <img src="assets/icons/icon-modificar.png" alt="edit" width="20" height="20">
        </button>
        <button class="btn-accion btn-ver" data-action="ver" data-id="${params.data.id_proveedor}" title="Ver productos">
            <img src="assets/icons/eye-open.png" alt="view" width="20" height="20">
        </button>
        <button class="btn-accion btn-eliminar" data-action="eliminar" data-id="${params.data.id_proveedor}" title="Eliminar">
            <img src="assets/icons/icon-basurero.png" alt="delete" width="20" height="20">
        </button>
        </div>
    `;
    }


  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('cellClicked', (event: any) => {
    const button = (event.event.target as HTMLElement).closest('button[data-action]');
    if (button) {
        const action = button.getAttribute('data-action');
        const id = button.getAttribute('data-id');
        if (action && id) this.handleAction(action, parseInt(id));
    }
    });
    
  }

  handleAction(action: string, id: number): void {
    const proveedor = this.rowData.find(p => p.id_proveedor === id);
    
    switch (action) {
      case 'editar':
        this.editarProveedor(proveedor);
        break;
      case 'ver':
        this.verProductos(proveedor);
        break;
      case 'eliminar':
        this.eliminarProveedor(proveedor);
        break;
    }
  }

  // Abrir modal para crear nuevo proveedor (según tipo seleccionado)
  nuevoProveedor(tipoProveedor: TipoProveedorResponse): void {
    const dialogRef = this.dialog.open(ProveedorDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { 
        modo: 'crear',
        tipoProveedor: tipoProveedor
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Proveedor creado:', result);
        this.cargarDatos(); // Recargar lista
      }
    });
  }

  // Editar proveedor
  editarProveedor(proveedor?: ProveedorResponse): void {
    if (!proveedor) return;

    // ✅ MOSTRAR LOADING
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'Cargando',
        message: 'Obteniendo datos del proveedor...',
        type: 'info',
        isLoading: true,
        loadingText: 'Cargando información completa'
      }
    });
    
    this.proveedorService.getById(proveedor.id_proveedor).subscribe({
      next: (response) => {
        // ✅ CERRAR LOADING
        loadingDialog.close();
        
        if (response.type === 'SUCCESS') {
          const proveedorCompleto = response.data;
          
          console.log('✅ Proveedor cargado con contactos:', proveedorCompleto);
          console.log('📋 Cantidad de contactos:', proveedorCompleto.contactos?.length || 0);
          
          const dialogRef = this.dialog.open(ProveedorDialogComponent, {
            width: '900px',
            maxHeight: '90vh',
            data: { 
              modo: 'editar',
              proveedor: proveedorCompleto,
              tipoProveedor: {
                id_tipo_proveedor: proveedorCompleto.id_tipo_proveedor,
                nombre_tipo: proveedorCompleto.tipo_proveedor
              }
            },
            disableClose: true
          });

          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              console.log('✅ Proveedor editado:', result);
              this.cargarDatos();
            }
          });
        } else {
          // ✅ MOSTRAR ERROR
          this.dialog.open(CustomMessageBoxComponent, {
            width: '350px',
            data: {
              title: 'Error',
              message: 'No se pudo cargar el proveedor',
              type: 'error',
              showCancel: false,
              confirmText: 'Entendido'
            }
          });
        }
      },
      error: (error) => {
        // ✅ CERRAR LOADING Y MOSTRAR ERROR
        loadingDialog.close();
        
        console.error('❌ Error al cargar proveedor:', error);
        
        this.dialog.open(CustomMessageBoxComponent, {
          width: '350px',
          data: {
            title: 'Error',
            message: 'Error al cargar el proveedor. Por favor intente nuevamente.',
            type: 'error',
            showCancel: false,
            confirmText: 'Entendido'
          }
        });
      }
    });
  }

  // Ver productos del proveedor
  verProductos(proveedor?: ProveedorResponse): void {
    if (!proveedor) return;
    
    // Abrir dialog con los productos
    const dialogRef = this.dialog.open(ProductosProveedorDialogComponent, {
        width: '1200px',
        maxHeight: '90vh',
        data: { proveedor: proveedor },
        disableClose: false
    });
    }

  // Eliminar proveedor (borrado lógico)
  eliminarProveedor(proveedor?: ProveedorResponse): void {
    if (!proveedor) return;
    
    if (confirm(`¿Está seguro de eliminar el proveedor ${proveedor.nombre_prov || proveedor.nombre_comercial}?`)) {
      this.proveedorService.delete(proveedor.id_proveedor).subscribe({
        next: (response) => {
          if (response.type === 'SUCCESS') {
            console.log('Proveedor eliminado correctamente');
            this.cargarDatos(); // Recargar lista
          }
        },
        error: (error) => {
          console.error('Error al eliminar proveedor:', error);
          alert('Error al eliminar el proveedor');
        }
      });
    }
  }

  // Filtros
  buscar(): void {
    this.currentPage = 1; // Resetear a página 1
    this.cargarDatos();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroTipoProveedor = '';
    this.filtroEstado = 'activos'; 
    this.filtroLista = '';
    this.currentPage = 1;
    this.cargarDatos();
  }

  // Cambio de paginación desde AG-Grid
onPaginationChanged(): void {
  if (this.gridApi) {
    const currentPage = this.gridApi.paginationGetCurrentPage();
    const pageSize = this.gridApi.paginationGetPageSize();
    
    // Validar que los valores sean números válidos
    if (currentPage !== undefined && 
        pageSize !== undefined && 
        !isNaN(currentPage) && 
        !isNaN(pageSize)) {
      
      const newPage = currentPage + 1;
      
      if (newPage !== this.currentPage || pageSize !== this.pageSize) {
        this.currentPage = newPage;
        this.pageSize = pageSize;
        this.cargarDatos();
      }
    }
  }
}
}