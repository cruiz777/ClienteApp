import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ClienteLicenseResponse } from 'src/app/interfaces/responses/cliente-license-response';
import { ClienteLicenseQuery, ValidacionService } from 'src/app/services/validacion.service';
import { ExportLicenseBatch, ExportLicenseItem, ExportLicenseQuery, ExportLicenseResponse } from 'src/app/interfaces/responses/export-licenses-response';

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
  selector: 'app-validador-licenses',
  templateUrl: './validador-licenses.component.html',
  styleUrls: ['./validador-licenses.component.css']
})
export class LicenseValidatorComponent implements OnInit {
 
  // Parámetros de búsqueda
  searchParams: SearchParams = {};

  // Datos de la tabla
  licencias: License[] = [];
  
  // Datos originales del servicio (para mapear)
  licenciasOriginales: ClienteLicenseResponse[] = [];
 
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

  constructor(private validacionService: ValidacionService) {}

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
  private mapearParametrosBusqueda(): ClienteLicenseQuery {
    const query: ClienteLicenseQuery = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    // Mapear campos del formulario a campos del servicio
    if (this.searchParams.ruc) {
      query.ruc = this.searchParams.ruc;
    }
    
    if (this.searchParams.prefijo) {
      query.codigoPrefijo = this.searchParams.prefijo;
    }
    
    if (this.searchParams.fechaDesde) {
      query.fechaDesde = this.searchParams.fechaDesde;
    }
    
    if (this.searchParams.fechaHasta) {
      query.fechaHasta = this.searchParams.fechaHasta;
    }
    
    if (this.searchParams.fechaIgual) {
      query.fechaIgual = this.searchParams.fechaIgual;
    }
    
    if (this.searchParams.nombreCliente) {
      query.nombreCliente = this.searchParams.nombreCliente;
    }
    
    // Mapear estados
    if (this.searchParams.prefijoEstado) {
      query.estadoPrefijo = this.searchParams.prefijoEstado === 'active';
    }
    
    if (this.searchParams.empresaEstado) {
      query.estadoEmpresa = this.searchParams.empresaEstado === 'active' ? 1 : 2;
    }

    return query;
  }

  // Mapear respuesta del servicio a formato de la tabla
  private mapearRespuestaServicio(clienteLicenses: ClienteLicenseResponse[]): License[] {
    return clienteLicenses.map((cliente, index) => ({
      id: cliente.cliente_codigo || index,
      licenseKey: cliente.license_key || 'N/A',
      licenseType: cliente.license_type || 'GCP',
      licenseStatus: cliente.license_status || 'Unknown',
      licenseName: cliente.license_name || 'N/A',
      licenseGLN: cliente.license_gln || 'N/A',
      address: cliente.address || 'N/A',
      addressSuburb: cliente.address_suburb || 'N/A',
      addressLocality: cliente.address_locality || 'N/A',
      addressRegion: cliente.address_region || 'N/A',
      telephone: cliente.telephone || 'N/A',
      email: cliente.email || 'N/A',
      website: cliente.website || 'N/A'
    }));
  }

  // Método principal de búsqueda
  buscar(): void {
    console.log('Buscar llamado con parámetros:', this.searchParams);
    
    this.isLoading = true;
    this.hasSearched = true;
    this.errorMessage = '';
    
    const query = this.mapearParametrosBusqueda();
    
    this.validacionService.getClientesLicense(query)
      .pipe(
        catchError(error => {
          console.error('Error al buscar licencias:', error);
          this.errorMessage = 'Error al cargar los datos. Por favor, intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response && response.data) {
          // Guardar datos originales desde la estructura correcta
          this.licenciasOriginales = response.data.items || [];
          
          // Mapear a formato de la tabla
          this.licencias = this.mapearRespuestaServicio(this.licenciasOriginales);
          
          // Actualizar información de paginación desde la nueva estructura
          this.totalItems = response.data.totalItems || 0;
          this.totalPages = response.data.totalPages || 0;
          this.currentPage = response.data.page || 1;
          
          console.log('Licencias cargadas:', this.licencias.length);
          console.log('Total items:', this.totalItems);
        } else {
          this.licencias = [];
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
    console.log('Nueva búsqueda');
    this.searchParams = {
    };
    this.hasSearched = false;
    this.currentPage = 1;
    this.errorMessage = '';
    this.licencias = [];
    this.totalItems = 0;
    this.totalPages = 0;
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

    // Crear query de exportación reutilizando EXACTAMENTE los mismos filtros de búsqueda
    const exportQuery: ExportLicenseQuery = {
      nombreCliente: this.searchParams.nombreCliente,
      codigoPrefijo: this.searchParams.prefijo,
      fechaDesde: this.searchParams.fechaDesde,
      fechaHasta: this.searchParams.fechaHasta,
      fechaIgual: this.searchParams.fechaIgual,
      ruc: this.searchParams.ruc,
      estadoPrefijo: this.searchParams.prefijoEstado === 'active' ? true : 
                      this.searchParams.prefijoEstado === 'inactive' ? false : undefined,
      estadoEmpresa: this.searchParams.empresaEstado === 'active' ? 1 : 
                     this.searchParams.empresaEstado === 'inactive' ? 2 : undefined,
      batchSize: 1000
    };

    this.validacionService.exportClientesLicense(exportQuery)
      .pipe(
        catchError(error => {
          console.error('Error al exportar licencias:', error);
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
  private procesarExportacion(exportData: ExportLicenseResponse): void {
    const { totalItems, totalBatches, batches } = exportData;

    console.log(`Exportación completada: ${totalItems} registros en ${totalBatches} lotes`);

    if (totalBatches === 0) {
      alert('No hay datos para exportar con los filtros aplicados');
      return;
    }

    if (totalBatches === 1) {
      // Un solo archivo
      this.descargarArchivo(batches[0].items, 'licencias_verified');
      alert(`Archivo descargado exitosamente con ${totalItems} registros.`);
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
  private descargarArchivo(items: ExportLicenseItem[], nombreBase: string, sufijo?: string): void {
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

  private descargarMultiplesArchivos(batches: ExportLicenseBatch[], totalItems: number): void {
    let archivosDescargados = 0;

    // Mostrar progreso al usuario
    const progressMessage = `Iniciando descarga de ${batches.length} archivos...`;
    console.log(progressMessage);

    // Descargar cada lote con delay para evitar bloquear el navegador
    batches.forEach((batch, index) => {
      setTimeout(() => {
        const sufijo = `parte_${batch.batchNumber.toString().padStart(2, '0')}`;
        this.descargarArchivo(batch.items, 'licencias_verified', sufijo);
        
        archivosDescargados++;
        console.log(`Archivo ${archivosDescargados}/${batches.length} descargado`);
        
        // Notificar cuando se complete la descarga
        if (archivosDescargados === batches.length) {
          alert(`✅ Descarga completada: ${batches.length} archivos con ${totalItems} registros totales.`);
        }
      }, index * 1500); // 1.5 segundos entre descargas
    });

    // Información inmediata al usuario
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

  // Ver detalle de licencia
  verDetalle(licencia: License): void {
    console.log('Ver detalle de licencia:', licencia);
    
    // Buscar datos originales para mostrar más información
    const licenciaOriginal = this.licenciasOriginales.find(l => 
      l.cliente_codigo === licencia.id || 
      l.license_name === licencia.licenseName
    );
    
    if (licenciaOriginal) {
      const detalle = `
        Detalle de la licencia:
        Clave de Licencia: ${licenciaOriginal.license_key || 'N/A'}
        Nombre: ${licenciaOriginal.license_name || 'N/A'}
        RUC: ${licenciaOriginal.ruc || 'N/A'}
        GLN: ${licenciaOriginal.license_gln || 'N/A'}
        Código Cliente: ${licenciaOriginal.cliente_codigo || 'N/A'}
        Código Prefijo: ${licenciaOriginal.codigo_prefijo || 'N/A'}
        Tipo de Licencia: ${licenciaOriginal.license_type || 'N/A'}
        Estado de Licencia: ${licenciaOriginal.license_status || 'N/A'}
        Clave de Licencia: ${licenciaOriginal.license_key || 'N/A'}
        Dirección: ${licenciaOriginal.address || 'N/A'}
        Suburbio: ${licenciaOriginal.address_suburb || 'N/A'}
        Localidad: ${licenciaOriginal.address_locality || 'N/A'}
        Región: ${licenciaOriginal.address_region || 'N/A'}
        Teléfono: ${licenciaOriginal.telephone || 'N/A'}
        Email: ${licenciaOriginal.email || 'N/A'}
        Sitio Web: ${licenciaOriginal.website || 'N/A'}
        Fecha de Ingreso: ${licenciaOriginal.fecha_ingreso || 'N/A'}
      `;
      alert(detalle);
    } else {
      alert(`Detalle de la licencia:\nNombre: ${licencia.licenseName}\nTipo: ${licencia.licenseType}\nEstado: ${licencia.licenseStatus}`);
    }
  }

  // Método para búsqueda general por nombre de cliente
  buscarGeneral(termino: string): void {
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
    return this.hasSearched && this.licencias.length > 0;
  }

  // Método helper para verificar si no hay resultados después de búsqueda
  get noResults(): boolean {
    return this.hasSearched && this.licencias.length === 0 && !this.isLoading;
  }
}