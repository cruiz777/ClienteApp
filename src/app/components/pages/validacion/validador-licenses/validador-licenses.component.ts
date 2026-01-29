// src/app/components/pages/validacion/validador-licenses/validador-licenses.component.ts

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { of, firstValueFrom } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ClienteLicenseResponse } from 'src/app/interfaces/responses/cliente-license-response';
import { ClienteLicenseQuery, ValidacionService } from 'src/app/services/validacion.service';

import {
  ExportLicenseBatch,
  ExportLicenseItem,
  ExportLicenseQuery,
  ExportLicenseResponse,
} from 'src/app/interfaces/responses/export-licenses-response';

import { CustomMessageBoxComponent } from 'src/app/components/utils/messages/custom-message-box.component';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';
import { CustomValidators } from 'src/app/components/utils/validators/validator.util';
import { PermissionsService } from 'src/app/services/permission.service';

export interface SearchParams {
  registro?: string;
  ruc?: string;
  tipo?: string;
  prefijo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaIgual?: string;
  prefijoEstado?: string; // 'active' | 'inactive'
  empresaEstado?: string; // 'active' | 'inactive'
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
  styleUrls: ['./validador-licenses.component.css'],
})
export class LicenseValidatorComponent implements OnInit {
  // ViewChild para referenciar el campo de búsqueda por nombre
  @ViewChild('campoBuscarNombre', { static: false })
  campoBuscarNombre!: ElementRef<HTMLInputElement>;

  @ViewChild('searchInput', { static: false })
  searchInput!: ElementRef<HTMLInputElement>;

  // Variable para controlar el valor del campo de búsqueda
  terminoBusquedaNombre: string = '';

  // Parametro para saber si se envia al API VERIFIED o no
  isSendingToApi = false;

  // Parámetros de búsqueda
  searchParams: SearchParams = {};

  // Datos de la tabla
  licencias: License[] = [];

  // Datos originales del servicio (para mapear)
  licenciasOriginales: ClienteLicenseResponse[] = [];

  // Validadores
  public CustomValidators = CustomValidators;

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

  constructor(
    private validacionService: ValidacionService,
    private dialog: MatDialog,
    private requiredFieldsToast: RequiredFieldsToastService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    // Defaults opcionales:
    // this.searchParams.fechaIgual = new Date().toISOString().split('T')[0];
  }

  // ==========================
  // GETTERS DE UI (INFO / PAGINACIÓN)
  // ==========================

  get numeroRegistros(): string {
    if (!this.hasSearched) return 'Sin registros';
    if (this.isLoading) return 'Buscando...';
    return this.totalItems.toString();
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  /** True si ya buscaste y tienes resultados */
  get hasResults(): boolean {
    return this.hasSearched && this.licencias.length > 0;
  }

  /** True si ya buscaste, no hay resultados y ya terminó de cargar */
  get noResults(): boolean {
    return this.hasSearched && this.licencias.length === 0 && !this.isLoading;
  }

  /** Texto informativo (tooltip / panel) sobre la exportación */
  get exportInfo(): string {
    if (!this.hasSearched) return '';
    if (this.totalItems <= 0) return 'No hay registros para exportar.';
    if (this.totalItems <= 1000) return `Se exportará 1 archivo con ${this.totalItems} registros.`;
    const archivos = Math.ceil(this.totalItems / 1000);
    return `Se exportarán ${archivos} archivos con ${this.totalItems} registros totales (máx. 1000 por archivo).`;
  }

  /** Habilita el botón buscar si existe al menos un criterio */
  get puedeRealizarBusqueda(): boolean {
    const hasText = (v?: string) => !!v && v.trim().length > 0;

    const tieneRuc = hasText(this.searchParams.ruc);
    const tienePrefijo = hasText(this.searchParams.prefijo);
    const tieneFechaIgual = hasText(this.searchParams.fechaIgual);
    const tieneFechaDesde = hasText(this.searchParams.fechaDesde);
    const tieneFechaHasta = hasText(this.searchParams.fechaHasta);
    const tieneNombreCliente = hasText(this.searchParams.nombreCliente);

    const tienePrefijoEstado = hasText(this.searchParams.prefijoEstado);
    const tieneEmpresaEstado = hasText(this.searchParams.empresaEstado);

    const tieneBusquedaGeneral = hasText(this.terminoBusquedaNombre);

    return (
      tieneRuc ||
      tienePrefijo ||
      tieneFechaIgual ||
      tieneFechaDesde ||
      tieneFechaHasta ||
      tieneNombreCliente ||
      tienePrefijoEstado ||
      tieneEmpresaEstado ||
      tieneBusquedaGeneral
    );
  }

  get mensajeBotonBuscar(): string {
    if (this.isLoading) return 'Buscando...';
    if (!this.puedeRealizarBusqueda) return 'Ingrese al menos un criterio de búsqueda';
    return 'Buscar';
  }

  get puedeExportarYEnviar(): boolean {
    return this.hasSearched && !this.isExporting && !this.isSendingToApi;
  }

  get textoBotonExportarEnviar(): string {
    if (this.isExporting && this.isSendingToApi) return 'Enviando a API...';
    if (this.isExporting) return 'Exportando...';
    if (this.isSendingToApi) return 'Enviando...';
    return 'Exportar y Enviar';
  }

  // ==========================
  // MAPEO DE PARÁMETROS / RESPUESTA
  // ==========================

  private mapearParametrosBusqueda(): ClienteLicenseQuery {
    const query: ClienteLicenseQuery = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
    };

    if (this.searchParams.ruc) query.ruc = this.searchParams.ruc;
    if (this.searchParams.prefijo) query.codigoPrefijo = this.searchParams.prefijo;
    if (this.searchParams.fechaDesde) query.fechaDesde = this.searchParams.fechaDesde;
    if (this.searchParams.fechaHasta) query.fechaHasta = this.searchParams.fechaHasta;
    if (this.searchParams.fechaIgual) query.fechaIgual = this.searchParams.fechaIgual;
    if (this.searchParams.nombreCliente) query.nombreCliente = this.searchParams.nombreCliente;

    if (this.searchParams.prefijoEstado) {
      query.estadoPrefijo = this.searchParams.prefijoEstado === 'active';
    }

    if (this.searchParams.empresaEstado) {
      query.estadoEmpresa = this.searchParams.empresaEstado === 'active' ? 1 : 2;
    }

    return query;
  }

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
      website: cliente.website || 'N/A',
    }));
  }

  // ==========================
  // BÚSQUEDA
  // ==========================

  buscar(): void {
    this.isLoading = true;
    this.hasSearched = true;
    this.errorMessage = '';

    const query = this.mapearParametrosBusqueda();

    this.validacionService
      .getClientesLicense(query)
      .pipe(
        catchError((error) => {
          console.error('Error al buscar licencias:', error);
          this.errorMessage = 'Error al cargar los datos. Por favor, intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((response) => {
        const r: any = response as any;

        if (r && r.data) {
          const data = r.data;

          this.licenciasOriginales = data.items || [];
          this.licencias = this.mapearRespuestaServicio(this.licenciasOriginales);

          this.totalItems = data.totalItems || 0;
          this.totalPages = data.totalPages || 0;
          this.currentPage = data.page || 1;

          if (this.totalItems === 0) this.mostrarInstruccionesPopup();
        } else {
          this.licencias = [];
          this.licenciasOriginales = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.errorMessage = r?.message || 'No se encontraron datos';
          this.mostrarInstruccionesPopup();
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.buscar();
  }

  nuevaBusqueda(): void {
    this.searchParams = {};
    this.terminoBusquedaNombre = '';

    if (this.searchInput?.nativeElement) this.searchInput.nativeElement.value = '';
    if (this.campoBuscarNombre?.nativeElement) this.campoBuscarNombre.nativeElement.value = '';

    this.hasSearched = false;
    this.currentPage = 1;
    this.errorMessage = '';
    this.licencias = [];
    this.licenciasOriginales = [];
    this.totalItems = 0;
    this.totalPages = 0;
  }

  limpiarForm(): void {
    this.searchParams = {
      registro: this.searchParams.registro,
      fechaIgual: new Date().toISOString().split('T')[0],
    };
    this.currentPage = 1;
    this.errorMessage = '';
  }

  // ==========================
  // BÚSQUEDA GENERAL (HTML LA LLAMA)
  // ==========================

  onBusquedaGeneralChange(termino: string): void {
    this.terminoBusquedaNombre = termino;

    if (termino && termino.trim()) {
      this.searchParams.nombreCliente = termino.trim();
    } else {
      this.searchParams.nombreCliente = undefined;
    }
  }

  buscarGeneral(termino: string): void {
    const t = (termino ?? '').toString().trim();
    this.terminoBusquedaNombre = t;

    if (!t) this.searchParams.nombreCliente = undefined;
    else this.searchParams.nombreCliente = t;

    this.currentPage = 1;
    this.buscar();
  }

  buscarPorRangoFechas(fechaDesde: string, fechaHasta: string): void {
    this.searchParams.fechaDesde = fechaDesde;
    this.searchParams.fechaHasta = fechaHasta;
    this.searchParams.fechaIgual = undefined;
    this.currentPage = 1;
    this.buscar();
  }

  // ==========================
  // EXPORTAR JSON (DESCARGA)
  // ==========================

  exportarJSON(): void {
    if (!this.hasSearched) {
      alert('Primero debe realizar una búsqueda para exportar datos');
      return;
    }

    this.isExporting = true;

    const exportQuery: ExportLicenseQuery = {
      nombreCliente: this.searchParams.nombreCliente,
      codigoPrefijo: this.searchParams.prefijo,
      fechaDesde: this.searchParams.fechaDesde,
      fechaHasta: this.searchParams.fechaHasta,
      fechaIgual: this.searchParams.fechaIgual,
      ruc: this.searchParams.ruc,
      estadoPrefijo:
        this.searchParams.prefijoEstado === 'active'
          ? true
          : this.searchParams.prefijoEstado === 'inactive'
          ? false
          : undefined,
      estadoEmpresa:
        this.searchParams.empresaEstado === 'active'
          ? 1
          : this.searchParams.empresaEstado === 'inactive'
          ? 2
          : undefined,
      batchSize: 1000,
    };

    this.validacionService
      .exportClientesLicense(exportQuery)
      .pipe(
        catchError((error) => {
          console.error('Error al exportar licencias:', error);
          this.errorMessage = 'Error al exportar los datos. Por favor, intente nuevamente.';
          return of(null);
        }),
        finalize(() => {
          this.isExporting = false;
        })
      )
      .subscribe((response) => {
        const r: any = response as any;
        if (r && r.data && r.type === 'Success') {
          this.procesarExportacion(r.data as ExportLicenseResponse);
        } else {
          this.errorMessage = r?.message || 'Error al procesar la exportación';
        }
      });
  }

  private procesarExportacion(exportData: ExportLicenseResponse): void {
    const { totalItems, totalBatches, batches } = exportData;

    if (totalBatches === 0) {
      alert('No hay datos para exportar con los filtros aplicados');
      return;
    }

    if (totalBatches === 1) {
      this.descargarArchivo(batches[0].items, 'licencias_verified');
      alert(`Archivo descargado exitosamente con ${totalItems} registros.`);
      return;
    }

    const confirmar = window.confirm(
      `Se encontraron ${totalItems} registros.\n` +
        `Se generarán ${totalBatches} archivos JSON (máximo 1000 registros por archivo).\n\n` +
        `¿Desea continuar con la descarga?`
    );

    if (confirmar) this.descargarMultiplesArchivos(batches, totalItems);
  }

 private descargarArchivo(items: ExportLicenseItem[], nombreBase: string, sufijo?: string): void {
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = sufijo
    ? `${nombreBase}_${sufijo}_${fecha}.json`
    : `${nombreBase}_${fecha}.json`;

  // ✅ SANITIZA SIEMPRE ANTES DE GENERAR EL JSON
  const sanitized = this.sanitizeLicensesForVerified(items);

  const dataStr = JSON.stringify(sanitized, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', nombreArchivo);
  linkElement.click();
}


  private descargarMultiplesArchivos(batches: ExportLicenseBatch[], totalItems: number): void {
    let archivosDescargados = 0;

    batches.forEach((batch, index) => {
      setTimeout(() => {
        const sufijo = `parte_${batch.batchNumber.toString().padStart(2, '0')}`;
        this.descargarArchivo(batch.items, 'licencias_verified', sufijo);

        archivosDescargados++;

        if (archivosDescargados === batches.length) {
          alert(`✅ Descarga completada: ${batches.length} archivos con ${totalItems} registros totales.`);
        }
      }, index * 1500);
    });

    alert(
      `📥 Se descargarán ${batches.length} archivos JSON secuencialmente.\n\n` +
        `Por favor, espere a que se completen todas las descargas.`
    );
  }

  // ==========================
  // VER DETALLE (OPCIONAL)
  // ==========================

  verDetalle(licencia: License): void {
    const licenciaOriginal = this.licenciasOriginales.find(
      (l) => l.cliente_codigo === licencia.id || l.license_name === licencia.licenseName
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
      alert(
        `Detalle de la licencia:\nNombre: ${licencia.licenseName}\nTipo: ${licencia.licenseType}\nEstado: ${licencia.licenseStatus}`
      );
    }
  }

  // ==========================
  // EXPORTAR + ENVIAR A API (SIN TOCAR BACKEND)
  // ==========================

  async exportarYEnviarConConfirmacion(): Promise<void> {
    if (!this.hasSearched) {
      this.showMessageBox('Error', 'Primero debe realizar una búsqueda para exportar datos', 'error');
      return;
    }

    this.isExporting = true;

    try {
      const exportData = await this.exportarLicencias();

      if (!exportData || exportData.totalItems === 0) {
        this.showMessageBox('Información', 'No hay licencias para exportar con los filtros aplicados', 'info');
        return;
      }

      const decision = await this.mostrarConfirmacionEnvio(exportData);

      if (decision === 'enviar') {
        await this.descargarYEnviarAApi(exportData);
      } else if (decision === 'descargar') {
        this.descargarTodosLosArchivos(exportData);
        this.showMessageBox('Éxito', 'Archivos JSON descargados correctamente', 'success');
      } else {
        this.showMessageBox('Información', 'Operación cancelada por el usuario', 'info');
      }
    } catch (error) {
      console.error('Error en exportación:', error);
      this.showMessageBox('Error', 'Error al exportar licencias. Intente nuevamente.', 'error');
    } finally {
      this.isExporting = false;
      this.isSendingToApi = false;
    }
  }

  private async exportarLicencias(): Promise<ExportLicenseResponse | null> {
    const exportQuery: ExportLicenseQuery = {
      nombreCliente: this.searchParams.nombreCliente,
      codigoPrefijo: this.searchParams.prefijo,
      fechaDesde: this.searchParams.fechaDesde,
      fechaHasta: this.searchParams.fechaHasta,
      fechaIgual: this.searchParams.fechaIgual,
      ruc: this.searchParams.ruc,
      estadoPrefijo:
        this.searchParams.prefijoEstado === 'active'
          ? true
          : this.searchParams.prefijoEstado === 'inactive'
          ? false
          : undefined,
      estadoEmpresa:
        this.searchParams.empresaEstado === 'active'
          ? 1
          : this.searchParams.empresaEstado === 'inactive'
          ? 2
          : undefined,
      batchSize: 1000,
    };

    const resp = await firstValueFrom(
      this.validacionService.exportClientesLicense(exportQuery).pipe(
        catchError((err) => {
          console.error('Error al exportar licencias:', err);
          return of(null);
        })
      )
    );

    if (!resp) return null;

    const r: any = resp as any;
    if (r.data && r.type === 'Success') return r.data as ExportLicenseResponse;

    throw new Error(r.message || 'Error al procesar la exportación');
  }

  private async mostrarConfirmacionEnvio(
    exportData: ExportLicenseResponse
  ): Promise<'enviar' | 'descargar' | 'cancelar'> {
    const { totalItems, totalBatches } = exportData;

    const mensaje = `✅ Se exportarán ${totalItems} licencias en ${totalBatches} lote(s).

¿Desea enviar las licencias a la API VERIFIED además de descargar los archivos JSON?`;

    const enviarAApi = await this.showConfirmDialog(
      'Confirmar Envío a API VERIFIED',
      mensaje,
      'info',
      'SÍ, Enviar a API',
      'NO, Solo Descargar'
    );

    if (enviarAApi === true) return 'enviar';
    if (enviarAApi === false) return 'descargar';
    return 'cancelar';
  }

  private async descargarYEnviarAApi(exportData: ExportLicenseResponse): Promise<void> {
    this.isSendingToApi = true;

    const { totalBatches, batches } = exportData;

    // Primero descargar archivos (opcional, pero lo dejas como estabas)
    this.descargarTodosLosArchivos(exportData);

    // Loading dialog
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title: 'Enviando a API VERIFIED',
        message: `Procesando ${totalBatches} lotes...`,
        type: 'info',
        isLoading: true,
        loadingText: 'Iniciando envío...',
      },
      disableClose: true,
      width: '400px',
    });

    let lotesExitosos = 0;
    let lotesFallidos = 0;
    const errores: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Actualiza progreso (si tu componente lo soporta)
      const componentInstance = loadingDialog.componentRef?.instance as any;
      if (componentInstance?.updateLoadingState) {
        componentInstance.updateLoadingState(true, `Enviando lote ${batch.batchNumber} de ${totalBatches}...`);
      }

      try {
        // ✅ CORRECCIÓN CLAVE: sanitizar antes de enviar
        const sanitizedItems = this.sanitizeLicensesForVerified(batch.items);

        const result = await this.enviarLoteAApi(sanitizedItems);

        if (result?.success) {
          lotesExitosos++;
        } else {
          lotesFallidos++;
          errores.push(`Lote ${batch.batchNumber}: ${result?.message || 'Error desconocido'}`);
        }

        if (i < batches.length - 1) await this.delay(1000);
      } catch (err: any) {
        lotesFallidos++;
        errores.push(`Lote ${batch.batchNumber}: ${err?.message || err?.toString?.() || 'Error'}`);
      }
    }

    loadingDialog.close();
    this.mostrarResumenEnvio(lotesExitosos, lotesFallidos, errores, exportData.totalItems);
  }

  private async enviarLoteAApi(licencias: any[]): Promise<any> {
    const resp = await firstValueFrom(
      this.validacionService.sendLicenciasToApi(licencias).pipe(
        catchError((err) => {
          throw err;
        })
      )
    );
    return resp;
  }

  private descargarTodosLosArchivos(exportData: ExportLicenseResponse): void {
    const { totalBatches, batches } = exportData;

    if (totalBatches === 1) {
      this.descargarArchivo(batches[0].items, 'licencias_verified');
      return;
    }

    batches.forEach((batch, index) => {
      setTimeout(() => {
        const sufijo = `parte_${batch.batchNumber.toString().padStart(2, '0')}`;
        this.descargarArchivo(batch.items, 'licencias_verified', sufijo);
      }, index * 1500);
    });
  }

  // ==========================
  // POPUP INSTRUCCIONES
  // ==========================

  private mostrarInstruccionesPopup(): void {
    const instrucciones = [
      '<strong>Validador de Licencias</strong>',
      '',
      'Utilice los filtros anteriores para buscar licencias en el sistema.',
      '',
      '<strong>Opciones de búsqueda:</strong>',
      '• <strong>Búsqueda rápida:</strong> Use el campo de búsqueda general por nombre',
      '• <strong>Filtros específicos:</strong> RUC, prefijo, estados',
      '• <strong>Filtros de fecha:</strong> Rango de fechas entre dos fechas',
      '• <strong>Estados:</strong> Filtre por estado del prefijo o empresa (Activo/Inactivo)',
    ];

    this.requiredFieldsToast.info(instrucciones.join('<br>'), 'Instrucciones de Búsqueda');
  }

  // ==========================
  // MENSAJES / CONFIRMACIONES
  // ==========================

  private mostrarResumenEnvio(exitosos: number, fallidos: number, errores: string[], totalLicencias: number): void {
    if (fallidos === 0) {
      const mensaje = `ENVÍO COMPLETADO EXITOSAMENTE!

✅ Lotes exitosos: ${exitosos}
Total licencias: ${totalLicencias}

Los archivos JSON también fueron descargados.`;

      this.showMessageBox('Éxito', mensaje, 'success');
      this.nuevaBusqueda();
      return;
    }

    const mensaje = `⚠️ ENVÍO COMPLETADO CON ERRORES

✅ Exitosos: ${exitosos} lotes
❌ Fallidos: ${fallidos} lotes
Total licencias: ${totalLicencias}

Revise la consola para más detalles.`;

    console.error('Errores de envío:', errores);
    this.showMessageBox('Advertencia', mensaje, 'warning');
  }

  private showMessageBox(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info'
  ): void {
    this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title,
        message,
        type,
        confirmText: 'Aceptar',
        showCancel: false,
      },
      width: '400px',
    });
  }

  private async showConfirmDialog(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    confirmText: string = 'Sí',
    cancelText: string = 'No'
  ): Promise<boolean | null> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      data: {
        title,
        message,
        type,
        confirmText,
        cancelText,
        showCancel: true,
      },
      width: '450px',
      disableClose: false,
    });

    return await firstValueFrom(dialogRef.afterClosed());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================
  // URL WEBSITE (HTML LA LLAMA)
  // ==========================
  getWebsiteUrl(website: string): string {
    if (!website) return '';

    const w = website.toString().trim();
    if (!w || w.toUpperCase() === 'N/A') return '';
    if (/^https?:\/\//i.test(w)) return w;
    return `https://${w}`;
  }

  // ==========================
  // ✅ SANITIZACIÓN PARA VERIFIED (LA PARTE QUE TE FALTABA)
  // ==========================

  private readonly provinciasISO: Record<string, string> = {
    'AZUAY': 'EC-A',
    'BOLIVAR': 'EC-B',
    'CANAR': 'EC-F',
    'CARCHI': 'EC-C',
    'CHIMBORAZO': 'EC-H',
    'COTOPAXI': 'EC-X',
    'EL ORO': 'EC-O',
    'ESMERALDAS': 'EC-E',
    'GALAPAGOS': 'EC-W',
    'GUAYAS': 'EC-G',
    'IMBABURA': 'EC-I',
    'LOJA': 'EC-L',
    'LOS RIOS': 'EC-R',
    'MANABI': 'EC-M',
    'MORONA SANTIAGO': 'EC-S',
    'NAPO': 'EC-N',
    'ORELLANA': 'EC-D',
    'PASTAZA': 'EC-Y',
    'PICHINCHA': 'EC-P',
    'SANTA ELENA': 'EC-SE',
    'SANTO DOMINGO DE LOS TSACHILAS': 'EC-SD',
    'SUCUMBIOS': 'EC-U',
    'TUNGURAHUA': 'EC-T',
    'ZAMORA CHINCHIPE': 'EC-Z',
  };

  private normalizeText(s: string): string {
    return (s || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // tildes
      .replace(/Ñ/g, 'N')
      .replace(/\s+/g, ' ');
  }

  private getSubdivisionCode(provincia: string): string {
    const key = this.normalizeText(provincia);
    return this.provinciasISO[key] || '';
  }

  private onlyDigits(s: string): string {
    return (s || '').replace(/\D+/g, '');
  }

  private normalizeWebsite(website?: string): string | undefined {
    const w = (website ?? '').toString().trim();
    if (!w || w.toUpperCase() === 'N/A') return undefined;
    if (/^https?:\/\//i.test(w)) return w;
    return `https://${w}`;
  }

 private sanitizeContactPoint(cp: any[] | undefined): Array<{ email?: string; telephone?: string; website?: string }> {
  const list = Array.isArray(cp) ? cp : [];

  const isBad = (v: any) => {
    const s = (v ?? '').toString().trim();
    if (!s) return true;
    const u = s.toUpperCase();
    return u === 'N/A' || u === 'NULL' || u === 'UNDEFINED';
  };

  let email: string | undefined;
  let telephone: string | undefined;
  let website: string | undefined;

  for (const item of list) {
    const e = item?.email;
    const t = item?.telephone;
    const w = item?.website;

    if (!email && !isBad(e)) email = e.toString().trim();
    if (!telephone && !isBad(t)) telephone = t.toString().trim();
    if (!website && !isBad(w)) website = w.toString().trim();

    if (email && telephone && website) break;
  }

  website = this.normalizeWebsite(website);

  // ✅ Retorna SOLO 1 contactPoint (Verified suele aceptar arreglo, pero sin duplicados)
  const single: any = {};
  if (email) single.email = email;
  if (telephone) single.telephone = telephone;
  if (website) single.website = website;

  return Object.keys(single).length ? [single] : [];
}


private sanitizeLicensesForVerified(items: ExportLicenseItem[]): ExportLicenseItem[] {
  return (items ?? []).map((it) => {
    const address: any = (it as any)?.address ?? {};

    const isBad = (v: any) => {
      const s = (v ?? '').toString().trim();
      if (!s) return true;
      const u = s.toUpperCase();
      return u === 'N/A' || u === 'NULL' || u === 'UNDEFINED';
    };

    // 1) postalName.value obligatorio (no vacío)
    const postalNameValue = (address?.postalName?.value ?? '').toString().trim();
    const licenseeName = (it as any)?.licenseeName?.toString?.().trim?.() || '';
    const fixedPostalNameValue = postalNameValue || licenseeName || 'N/A';

    // 2) postalCode obligatorio (no vacío) -> solo dígitos (fallback)
    const postalRaw = (address?.postalCode ?? '').toString().trim();
    const postalDigits = this.onlyDigits(postalRaw);
    const fixedPostalCode = postalDigits.length > 0 ? postalDigits : '000000';

    // 3) countrySubdivisionCode (idealmente no vacío para EC) -> ISO por provincia
    const region = (address?.addressRegion?.value ?? '').toString().trim();
    const existingSubdiv = (address?.countrySubdivisionCode ?? '').toString().trim();
    const fixedSubdiv = existingSubdiv || this.getSubdivisionCode(region) || '';

    // 4) postOfficeBoxNumber: si VERIFIED lo exige, NO lo elimines, pon default
    const pobRaw = (address?.postOfficeBoxNumber ?? '').toString().trim();
    const fixedPob = !isBad(pobRaw) ? pobRaw : 'S/N';

    // 5) contactPoint: 1 solo, sin nulls/duplicados
    const fixedContactPoint = this.sanitizeContactPoint((it as any)?.contactPoint);

    const newAddress: any = {
      ...address,
      postalName: {
        language: (address?.postalName?.language ?? 'es').toString().trim() || 'es',
        value: fixedPostalNameValue,
      },
      postalCode: fixedPostalCode,
      countrySubdivisionCode: fixedSubdiv,
      postOfficeBoxNumber: fixedPob, // <-- clave
    };

    return {
      ...it,
      address: newAddress,
      contactPoint: fixedContactPoint,
    } as ExportLicenseItem;
  });
}


}
