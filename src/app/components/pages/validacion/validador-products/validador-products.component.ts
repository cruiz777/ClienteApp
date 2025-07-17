import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ClienteLicenseResponse } from 'src/app/interfaces/responses/cliente-license-response';
import { ClienteLicenseQuery, ValidacionService } from 'src/app/services/validacion.service';
import { ExportLicenseBatch, ExportLicenseItem, ExportLicenseQuery, ExportLicenseResponse } from 'src/app/interfaces/responses/export-licenses-response';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { FechaOperator } from 'src/app/interfaces/responses/fecha-operator-enum';
import { ExportProductosResponse, ProductoLicenseResponse } from 'src/app/interfaces/responses/products-license-response';
import { ExportProductosQuery, ProductoLicenseQuery } from 'src/app/interfaces/responses/export-products-response';

export interface SearchParams {
  registro?: string;
  ruc?: string;
  tipo?: string;
  prefijo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaIgual?: string;
  operadorFecha?: FechaOperator; 
  prefijoEstado?: string;
  empresaEstado?: string;
  gtinEstado?: string; 
  idUsuario?: number; 
  nombreCliente?: string;
}

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

@Component({
  selector: 'app-validador-products',
  templateUrl: './validador-products.component.html',
  styleUrls: ['./validador-products.component.css']
})
export class ProductsLicenseValidator implements OnInit {
  
   // ViewChild para referenciar el campo de búsqueda por nombre
  @ViewChild('campoBuscarNombre', { static: false }) campoBuscarNombre!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;

  // Variable para controlar el valor del campo de búsqueda
  terminoBusquedaNombre: string = '';
  
  //Parametro para saber si se envia al API VERIFIED o o
  isSendingToApi = false;

  // Parámetros de búsqueda
  searchParams: SearchParams = {};

  // Datos de la tabla
  productos: Product[] = [];
  
  // Datos originales del servicio (para mapear)
  productosOriginales: ProductoLicenseResponse[] = [];
  //Operadores de fecha para el campo de fecha igual
  FechaOperator = FechaOperator;
  // Estados de carga y búsqueda
  isLoading = false;
  hasSearched = false;
  errorMessage = '';
  isExporting = false;
  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(private validacionService: ValidacionService,
    private dialog: MatDialog 
  ) {}

  ngOnInit(): void {
    // Establecer fecha actual por defecto
    //this.searchParams.fechaIgual = new Date().toISOString().split('T')[0];
    
    // Cargar datos iniciales (OPCIONAL)-- Carga datos sin necesidad de aplicar los filtros. Manejar con cuidado porque puede confundir al usuario
    //this.buscar();
  }
  // Getter para mostrar el número de registros dinámicamente
  get numeroRegistros(): string {
    if (!this.hasSearched) {
      return 'Sin registros';
    }
    
    if (this.isLoading) {
      return 'Buscando...';
    }
    
    return this.totalItems.toString();
  }
  // Getters para la información de paginación
  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  // Mapear parámetros de búsqueda a parámetros del servicio
   private mapearParametrosBusqueda(): ProductoLicenseQuery { // 🔄 era: ClienteLicenseQuery
    const query: ProductoLicenseQuery = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.searchParams.ruc) query.ruc = this.searchParams.ruc;
    if (this.searchParams.prefijo) query.codigoPrefijo = this.searchParams.prefijo;
    if (this.searchParams.fechaDesde) query.fechaDesde = this.searchParams.fechaDesde;
    if (this.searchParams.fechaHasta) query.fechaHasta = this.searchParams.fechaHasta;
    if (this.searchParams.fechaIgual) query.fechaIgual = this.searchParams.fechaIgual;
    if (this.searchParams.operadorFecha !== undefined) query.operadorFecha = this.searchParams.operadorFecha; // 🆕 NUEVO
    if (this.searchParams.nombreCliente) query.nombreCliente = this.searchParams.nombreCliente;
    if (this.searchParams.idUsuario) query.idUsuario = this.searchParams.idUsuario; // 🆕 NUEVO

    // Estados
    if (this.searchParams.prefijoEstado) {
      query.estadoPrefijo = this.searchParams.prefijoEstado === 'active';
    }
    if (this.searchParams.empresaEstado) {
      query.estadoEmpresa = this.searchParams.empresaEstado === 'active' ? 1 : 2;
    }
    if (this.searchParams.gtinEstado) { // 🆕 NUEVO
      query.estadoGtin = this.searchParams.gtinEstado === 'active';
    }

    return query;
  }

  // Mapear respuesta del servicio a formato de la tabla
  private mapearRespuestaServicio(productos: ProductoLicenseResponse[]): Product[] { 
    return productos.map((producto, index) => ({
      id: producto.producto_id || index, // 🔄 era: cliente_codigo
      gtin: producto.gtin || 'N/A', // 🆕 NUEVO
      gtinStatus: producto.gtin_status || 'Unknown', // 🆕 NUEVO
      licenceKey: producto.licence_key || 'N/A', // 🆕 NUEVO
      licenceType: producto.licence_type || 'GCP', // 🔄 mapeo cambiado
      brandName: producto.brand_name || 'N/A', // 🔄 mapeo cambiado
      productDescription: producto.product_description || 'N/A', // 🆕 NUEVO
      productImageUrl: producto.product_image_url || 'N/A', // 🆕 NUEVO
      netContentValue: producto.net_content_value || 'N/A', // 🆕 NUEVO
      netContentUnitCode: producto.net_content_unit_code || 'N/A', // 🆕 NUEVO
      nombreCliente: producto.nombre_cliente || 'N/A', // 🆕 NUEVO
      codigoPrefijo: producto.codigo_prefijo || 'N/A', // 🆕 NUEVO
      fechaCreacion: producto.fecha_creacion || 'N/A' // 🆕 NUEVO
    }));
  }

  // Método principal de búsqueda
    buscar(): void {
    console.log('Buscar productos con parámetros:', this.searchParams);
    
    this.isLoading = true;
    this.hasSearched = true;
    this.errorMessage = '';
    
    const query = this.mapearParametrosBusqueda();
    
    this.validacionService.getProductosLicense(query) // 🔄 era: getClientesLicense
      .pipe(
        catchError(error => {
          console.error('Error al buscar productos:', error);
          this.errorMessage = 'Error al cargar los datos. Por favor, intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response && response.data) {
          this.productosOriginales = response.data.items || []; // 🔄 era: licenciasOriginales
          this.productos = this.mapearRespuestaServicio(this.productosOriginales); // 🔄 era: licencias
          
          this.totalItems = response.data.totalItems || 0;
          this.totalPages = response.data.totalPages || 0;
          this.currentPage = response.data.page || 1;
          
          console.log('Productos cargados:', this.productos.length); // 🔄 era: Licencias
        } else {
          this.productos = []; // 🔄 era: licencias
          this.totalItems = 0;
          this.totalPages = 0;
          this.errorMessage = response?.message || 'No se encontraron datos';
        }
      });
  }

  // Manejo de cambio de página
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    console.log('Página cambiada a:', this.currentPage, 'Tamaño:', this.pageSize);
    
    // Realizar nueva búsqueda con la nueva página
    this.buscar();
  }

  // Nueva búsqueda (resetear formulario)
  nuevaBusqueda(): void {
    console.log('Nueva búsqueda - Limpiando todos los campos');
    
    // 1. Limpiar completamente searchParams
    this.searchParams = {};
    
    // 2. Limpiar variable de control del nombre
    this.terminoBusquedaNombre = '';
    
    // 3. Limpiar el campo de búsqueda general (#searchInput)
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
    
    // 4. Limpiar el campo de búsqueda por nombre (#campoBuscarNombre) si existe
    if (this.campoBuscarNombre && this.campoBuscarNombre.nativeElement) {
      this.campoBuscarNombre.nativeElement.value = '';
    }
    
    // 5. Resetear todos los estados
    this.hasSearched = false;
    this.currentPage = 1;
    this.errorMessage = '';
    this.productos  = [];
    this.productosOriginales = [];
    this.totalItems = 0;
    this.totalPages = 0;
    
    console.log('Todos los campos limpiados correctamente');
  }

  // Limpiar formulario (mantener registro)
  limpiarForm(): void {
    console.log('Limpiar formulario');
    this.searchParams = {
      registro: this.searchParams.registro,
      fechaIgual: new Date().toISOString().split('T')[0]
    };
    this.currentPage = 1;
    this.errorMessage = '';
  }

  // Exportar datos a JSON
  exportarJSON(): void {
    console.log('Iniciando exportación JSON con filtros actuales');
    
    if (!this.hasSearched) {
      alert('Primero debe realizar una búsqueda para exportar datos');
      return;
    }

    this.isExporting = true;

    const exportQuery: ExportProductosQuery = { // 🔄 era: ExportLicenseQuery
      nombreCliente: this.searchParams.nombreCliente,
      codigoPrefijo: this.searchParams.prefijo,
      fechaDesde: this.searchParams.fechaDesde,
      fechaHasta: this.searchParams.fechaHasta,
      fechaIgual: this.searchParams.fechaIgual,
      operadorFecha: this.searchParams.operadorFecha, // 🆕 NUEVO
      ruc: this.searchParams.ruc,
      estadoPrefijo: this.searchParams.prefijoEstado === 'active' ? true : 
                      this.searchParams.prefijoEstado === 'inactive' ? false : undefined,
      estadoEmpresa: this.searchParams.empresaEstado === 'active' ? 1 : 
                     this.searchParams.empresaEstado === 'inactive' ? 2 : undefined,
      estadoGtin: this.searchParams.gtinEstado === 'active' ? true :  // 🆕 NUEVO
                  this.searchParams.gtinEstado === 'inactive' ? false : undefined,
      idUsuario: this.searchParams.idUsuario, // 🆕 NUEVO
      batchSize: 1000
    };

    this.validacionService.exportProductosLicense(exportQuery) // 🔄 era: exportClientesLicense
      .pipe(
        catchError(error => {
          console.error('Error al exportar productos:', error); // 🔄 era: licencias
          this.errorMessage = 'Error al exportar los datos. Por favor, intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.isExporting = false;
        })
      )
      .subscribe(response => {
        if (response && response.data && response.type === 'Success') {
          this.procesarExportacion(response.data);
        } else {
          this.errorMessage = response?.message || 'Error al procesar la exportación';
        }
      });
  }
  private procesarExportacion(exportData: ExportProductosResponse): void {
    const { totalItems, totalBatches, batches } = exportData;
    console.log(`Exportación completada: ${totalItems} productos en ${totalBatches} lotes`); // 🔄 era: registros

    if (totalBatches === 0) {
      alert('No hay productos para exportar con los filtros aplicados'); // 🔄 era: datos
      return;
    }

    if (totalBatches === 1) {
      this.descargarArchivo(batches[0].items, 'productos_verified'); // 🔄 era: licencias_verified
      alert(`Archivo descargado exitosamente con ${totalItems} productos.`); // 🔄 era: registros
    } else {
      // Múltiples archivos
      const confirmar = window.confirm(
        `Se encontraron ${totalItems} registros.\n` +
        `Se generarán ${totalBatches} archivos JSON (máximo 1000 registros por archivo).\n\n` +
        `¿Desea continuar con la descarga?`
      );

      if (confirmar) {
        this.descargarMultiplesArchivos(batches, totalItems);
      }
    }
  }

    private descargarArchivo(items: any[], nombreBase: string, sufijo?: string): void {
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = sufijo 
            ? `${nombreBase}_${sufijo}_${fecha}.json`
            : `${nombreBase}_${fecha}.json`;

        const dataStr = JSON.stringify(items, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', nombreArchivo);
        linkElement.click();
    }


    private descargarMultiplesArchivos(batches: any[], totalItems: number): void {
        let archivosDescargados = 0;

        const progressMessage = `Iniciando descarga de ${batches.length} archivos...`;
        console.log(progressMessage);

        batches.forEach((batch, index) => {
            setTimeout(() => {
            const sufijo = `parte_${batch.batchNumber.toString().padStart(2, '0')}`;
            this.descargarArchivo(batch.items, 'productos_verified', sufijo); // ✅ Cambiar nombre base
            
            archivosDescargados++;
            console.log(`Archivo ${archivosDescargados}/${batches.length} descargado`);
            
            if (archivosDescargados === batches.length) {
                alert(`✅ Descarga completada: ${batches.length} archivos con ${totalItems} registros totales.`);
            }
            }, index * 1500);
        });

        alert(`📥 Se descargarán ${batches.length} archivos JSON secuencialmente.\n\nPor favor, espere a que se completen todas las descargas (aproximadamente ${Math.ceil(batches.length * 1.5)} segundos).`);
    }

  // Método helper actualizado para mostrar información de exportación
  get exportInfo(): string {
    if (!this.hasSearched) return '';
    
    if (this.totalItems <= 1000) {
      return `Se exportará 1 archivo con ${this.totalItems} registros.`;
    } else {
      const archivos = Math.ceil(this.totalItems / 1000);
      return `Se exportarán ${archivos} archivos con ${this.totalItems} registros totales.`;
    }
  }

  // Ver detalle de producto
  verDetalle(producto: Product): void {
    console.log('Ver detalle de producto:', producto);
    
    // Buscar datos originales para mostrar más información
    const productoOriginal = this.productosOriginales.find(p => 
        p.producto_id === producto.id || 
        p.brand_name === producto.brandName
    );
    
    if (productoOriginal) {
        const detalle = `
        Detalle del producto:
        GTIN: ${productoOriginal.gtin || 'N/A'}
        Estado GTIN: ${productoOriginal.gtin_status || 'N/A'}
        Clave de Licencia: ${productoOriginal.licence_key || 'N/A'}
        Tipo de Licencia: ${productoOriginal.licence_type || 'N/A'}
        Nombre de Marca: ${productoOriginal.brand_name || 'N/A'}
        Descripción: ${productoOriginal.product_description || 'N/A'}
        Imagen: ${productoOriginal.product_image_url || 'N/A'}
        Contenido Neto: ${productoOriginal.net_content_value || 'N/A'} ${productoOriginal.net_content_unit_code || ''}
        Cliente: ${productoOriginal.nombre_cliente || 'N/A'}
        Código Prefijo: ${productoOriginal.codigo_prefijo || 'N/A'}
        Fecha de Creación: ${productoOriginal.fecha_creacion || 'N/A'}
        ID Usuario: ${productoOriginal.id_usuario || 'N/A'}
        `;
        alert(detalle);
    } else {
        alert(`Detalle del producto:\nGTIN: ${producto.gtin}\nMarca: ${producto.brandName}\nTipo: ${producto.licenceType}`);
    }
    }


  // Método para búsqueda general por nombre de cliente
  buscarGeneral(termino: string): void {
    // Actualizar la variable de control
    this.terminoBusquedaNombre = termino;

    if (!termino.trim()) {
      // Si no hay término, limpiar búsqueda general y buscar sin filtro de nombre
      this.searchParams.nombreCliente = undefined;
      this.buscar();
      return;
    }
    
    // Establecer término de búsqueda en nombreCliente
    this.searchParams.nombreCliente = termino.trim();
    this.currentPage = 1;
    this.buscar();
  }

  // Método para búsqueda por rango de fechas
  buscarPorRangoFechas(fechaDesde: string, fechaHasta: string): void {
    this.searchParams.fechaDesde = fechaDesde;
    this.searchParams.fechaHasta = fechaHasta;
    this.searchParams.fechaIgual = undefined; // Limpiar fecha igual si se usa rango
    this.currentPage = 1;
    this.buscar();
  }

  // Método helper para formatear fechas
  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-EC');
    } catch (error) {
      return fecha;
    }
  }

  // Método helper para validar email
  private esEmailValido(email: string): boolean {
    if (!email || email === 'N/A') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método helper para validar URL
  private esUrlValida(url: string): boolean {
    if (!url || url === 'N/A') return false;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  // Método para obtener URL completa del sitio web
  getWebsiteUrl(website: string): string {
    if (!website || website === 'N/A') return '';
    return website.startsWith('http') ? website : `https://${website}`;
  }

  // Método helper para verificar si hay resultados
  get hasResults(): boolean {
    return this.hasSearched && this.productos.length > 0;
  }

  // Método helper para verificar si no hay resultados después de búsqueda
  get noResults(): boolean {
    return this.hasSearched && this.productos.length === 0 && !this.isLoading;
  }

  /**
 * Método para detectar cuando se escribe en el campo de búsqueda general
 */
  onBusquedaGeneralChange(termino: string): void {
    this.terminoBusquedaNombre = termino;
    
    if (termino.trim()) {
      this.searchParams.nombreCliente = termino.trim();
    } else {
      this.searchParams.nombreCliente = undefined;
    }
  }

  /**
   * Getter que determina si el botón buscar debe estar habilitado
   * Se habilita cuando hay al menos un campo con datos
   */
  get puedeRealizarBusqueda(): boolean {
    const esStringValido = (valor: string | undefined): boolean => {
        return valor !== undefined && valor !== null && valor.trim().length > 0;
    };

    const esNumeroValido = (valor: number | undefined): boolean => {
        return valor !== undefined && valor !== null && valor > 0;
    };

    // Verificar campos de texto existentes
    const tieneRuc = esStringValido(this.searchParams.ruc);
    const tienePrefijo = esStringValido(this.searchParams.prefijo);
    const tieneFechaIgual = esStringValido(this.searchParams.fechaIgual);
    const tieneFechaDesde = esStringValido(this.searchParams.fechaDesde);
    const tieneFechaHasta = esStringValido(this.searchParams.fechaHasta);
    const tieneNombreCliente = esStringValido(this.searchParams.nombreCliente);
    const tieneBusquedaGeneral = esStringValido(this.terminoBusquedaNombre);
    
    // Estados existentes
    const tienePrefijoEstado = esStringValido(this.searchParams.prefijoEstado);
    const tieneEmpresaEstado = esStringValido(this.searchParams.empresaEstado);
    
    // 🆕 NUEVOS CAMPOS
    const tieneGtinEstado = esStringValido(this.searchParams.gtinEstado);
    const tieneIdUsuario = esNumeroValido(this.searchParams.idUsuario);
    
    // Retornar true si hay al menos un campo completado
    return tieneRuc || tienePrefijo || tieneFechaIgual || tieneFechaDesde || 
            tieneFechaHasta || tieneNombreCliente || tienePrefijoEstado || 
            tieneEmpresaEstado || tieneBusquedaGeneral || 
            tieneGtinEstado || tieneIdUsuario; // 🆕 Agregados
    }

  /**
   * Getter para mostrar un mensaje helpful cuando el botón está deshabilitado
   */
  get mensajeBotonBuscar(): string {
    if (this.isLoading) {
      return 'Buscando...';
    }
    
    if (!this.puedeRealizarBusqueda) {
      return 'Ingrese al menos un criterio de búsqueda';
    }
    
    return 'Buscar';
  }

  // MÉTODO PRINCIPAL: Exportar y Enviar con Confirmación
  async exportarYEnviarConConfirmacion(): Promise<void> {
    console.log('Iniciando exportación con confirmación para envío a API');
    
    if (!this.hasSearched) {
        this.showMessageBox('Error', 'Primero debe realizar una búsqueda para exportar datos', 'error');
        return;
    }

    this.isExporting = true;

    try {
        // PASO 1: Exportar productos (✅ cambiar nombre del método)
        console.log('Paso 1: Exportando productos...');
        const exportData = await this.exportarProductos(); // ✅ Era: exportarLicencias
        
        if (!exportData || exportData.totalItems === 0) {
        this.showMessageBox('Información', 'No hay productos para exportar con los filtros aplicados', 'info'); // ✅ cambiar mensaje
        return;
        }

        // PASO 2: Mostrar confirmación en secuencia
        console.log('Paso 2: Mostrando confirmación...');
        const decision = await this.mostrarConfirmacionEnvio(exportData);
        
        switch (decision) {
        case 'enviar':
            console.log('Usuario eligió: Enviar a API');
            await this.descargarYEnviarAApi(exportData);
            break;
            
        case 'descargar':
            console.log('Usuario eligió: Solo descargar');
            this.descargarTodosLosArchivos(exportData);
            this.showMessageBox('Éxito', 'Archivos JSON descargados correctamente', 'success');
            break;
            
        case 'cancelar':
            console.log('Usuario canceló la operación');
            this.showMessageBox('Información', 'Operación cancelada por el usuario', 'info');
            break;
        }

    } catch (error) {
        console.error('Error en exportación:', error);
        this.showMessageBox('Error', 'Error al exportar productos. Intente nuevamente.', 'error'); // ✅ cambiar mensaje
    } finally {
        this.isExporting = false;
        this.isSendingToApi = false;
    }
    }

   private async exportarProductos(): Promise<ExportProductosResponse | null> {
    const exportQuery: ExportProductosQuery = { // ✅ Cambiar tipo
        nombreCliente: this.searchParams.nombreCliente,
        codigoPrefijo: this.searchParams.prefijo,
        fechaDesde: this.searchParams.fechaDesde,
        fechaHasta: this.searchParams.fechaHasta,
        fechaIgual: this.searchParams.fechaIgual,
        operadorFecha: this.searchParams.operadorFecha, // ✅ Agregar campo nuevo
        ruc: this.searchParams.ruc,
        estadoPrefijo: this.searchParams.prefijoEstado === 'active' ? true : 
                        this.searchParams.prefijoEstado === 'inactive' ? false : undefined,
        estadoEmpresa: this.searchParams.empresaEstado === 'active' ? 1 : 
                    this.searchParams.empresaEstado === 'inactive' ? 2 : undefined,
        estadoGtin: this.searchParams.gtinEstado === 'active' ? true : // ✅ Agregar campo nuevo
                    this.searchParams.gtinEstado === 'inactive' ? false : undefined,
        idUsuario: this.searchParams.idUsuario, // ✅ Agregar campo nuevo
        batchSize: 1000
    };

    return new Promise((resolve, reject) => {
        this.validacionService.exportProductosLicense(exportQuery) // ✅ Cambiar servicio
        .pipe(
            catchError(error => {
            console.error('Error al exportar productos:', error);
            reject(error);
            return of(null);
            })
        )
        .subscribe(response => {
            if (response && response.data && response.type === 'Success') {
            resolve(response.data);
            } else {
            reject(new Error(response?.message || 'Error al procesar la exportación'));
            }
        });
    });
    }

    private async mostrarConfirmacionEnvio(exportData: ExportProductosResponse): Promise<'enviar' | 'descargar' | 'cancelar'> {
        const { totalItems, totalBatches } = exportData;
        
        const mensaje1 = `✅ Se exportarán ${totalItems} productos en ${totalBatches} lote(s).

        ¿Desea enviar los productos a la API VERIFIED además de descargar los archivos JSON?`;

        const enviarAApi = await this.showConfirmDialog(
            'Confirmar Envío a API VERIFIED', 
            mensaje1, 
            'info',
            'SÍ, Enviar a API',
            'NO, Solo Descargar'
        );

        if (enviarAApi === true) {
            return 'enviar';
        } else if (enviarAApi === false) {
            return 'descargar';
        } else {
            return 'cancelar';
        }
    }

  private async descargarYEnviarAApi(exportData: ExportProductosResponse): Promise<void> {
    this.isSendingToApi = true;
    const { totalBatches, batches } = exportData;
    
    console.log(`Enviando ${totalBatches} lotes a API VERIFIED...`);
    
    // Primero descargar archivos
    this.descargarTodosLosArchivos(exportData);
    
    // Crear loading dialog
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Enviando a API VERIFIED',
        message: `Procesando ${totalBatches} lotes...`,
        type: 'info',
        isLoading: true,
        loadingText: 'Iniciando envío...'
      },
      disableClose: true,
      width: '400px'
    });

    let lotesExitosos = 0;
    let lotesFallidos = 0;
    const errores: string[] = [];

    // Enviar cada lote secuencialmente
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Actualizar progreso en el loading dialog
      const componentInstance = loadingDialog.componentRef?.instance as CustomMessageBoxComponent;
      if (componentInstance) {
        componentInstance.updateLoadingState(
          true, 
          `Enviando lote ${batch.batchNumber} de ${totalBatches}...`
        );
      }
      
      try {
        console.log(`Enviando lote ${batch.batchNumber}/${totalBatches}...`);
        
        const request = {
          apiType: 'licencias',
          products: batch.items
        };

        const result = await this.enviarLoteAApi(batch.items);
        
        if (result.success) {
          lotesExitosos++;
          console.log(`✅ Lote ${batch.batchNumber} enviado exitosamente`);
        } else {
          lotesFallidos++;
          const error = `Lote ${batch.batchNumber}: ${result.message}`;
          errores.push(error);
          console.error(`❌ Error en lote ${batch.batchNumber}:`, result.message);
        }
        
        // Pausa entre envíos
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
        
      } catch (error) {
        lotesFallidos++;
        const errorMsg = `Lote ${batch.batchNumber}: ${error}`;
        errores.push(errorMsg);
        console.error(`❌ Error enviando lote ${batch.batchNumber}:`, error);
      }
    }

    // Cerrar loading dialog
    loadingDialog.close();

    // Mostrar resumen final
    this.mostrarResumenEnvio(lotesExitosos, lotesFallidos, errores, exportData.totalItems);
  }

   private async enviarLoteAApi(productos: any[]): Promise<any> { // 🔄 era: licencias
    return new Promise((resolve, reject) => {
      this.validacionService.sendProductosToApi({ // 🔄 era: sendLicenciasToApi
        apiType: 'gtins', // 🔄 era: 'licencias'
        products: productos
      })
        .pipe(
          catchError(error => {
            reject(error);
            return of(null);
          })
        )
        .subscribe(response => {
          if (response) {
            resolve(response);
          } else {
            reject(new Error('No response from API'));
          }
        });
    });
  }

  private descargarTodosLosArchivos(exportData: ExportProductosResponse): void {
    const { totalBatches, batches } = exportData;
    
    if (totalBatches === 1) {
        this.descargarArchivo(batches[0].items, 'productos_verified'); // ✅ Cambiar nombre base
    } else {
        batches.forEach((batch, index) => {
        setTimeout(() => {
            const sufijo = `parte_${batch.batchNumber.toString().padStart(2, '0')}`;
            this.descargarArchivo(batch.items, 'productos_verified', sufijo); // ✅ Cambiar nombre base
        }, index * 1500);
        });
    }
  }

  private mostrarResumenEnvio(exitosos: number, fallidos: number, errores: string[], totalProductos: number): void {
    if (fallidos === 0) {
        const mensaje = `ENVÍO COMPLETADO EXITOSAMENTE!

    Los archivos JSON también fueron descargados.`;

        this.showMessageBox('Éxito', mensaje, 'success');
        this.nuevaBusqueda()
    } else {
        const mensaje = `⚠️ ENVÍO COMPLETADO CON ERRORES

    ✅ Exitosos: ${exitosos} lotes
    ❌ Fallidos: ${fallidos} lotes  
    Total productos: ${totalProductos}

    Revise la consola para más detalles.`;

        this.showMessageBox('Advertencia', mensaje, 'warning');
    }
    }

  private showMessageBox(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: title,
        message: message,
        type: type,
        confirmText: 'Aceptar',
        showCancel: false
      },
      width: '400px'
    });
  }
  private showConfirmDialog(
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info',
    confirmText: string = 'Sí',
    cancelText: string = 'No'
  ): Promise<boolean | null> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: title,
        message: message,
        type: type,
        confirmText: confirmText,
        cancelText: cancelText,
        showCancel: true
      },
      width: '450px',
      disableClose: false
    });

    return dialogRef.afterClosed().toPromise();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get puedeExportarYEnviar(): boolean {
    return this.hasSearched && !this.isExporting && !this.isSendingToApi;
  }

  get textoBotonExportarEnviar(): string {
    if (this.isExporting && this.isSendingToApi) {
      return 'Enviando a API...';
    } else if (this.isExporting) {
      return 'Exportando...';
    } else if (this.isSendingToApi) {
      return 'Enviando...';
    } else {
      return 'Exportar y Enviar';
    }
  }
}