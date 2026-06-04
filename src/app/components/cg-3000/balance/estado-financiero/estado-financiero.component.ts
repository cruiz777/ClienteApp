import { Component, Injectable, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EstadoFinancieroResponse } from 'src/app/interfaces/responses/estado-financiero-response';
import { BalanceService } from 'src/app/services/balance.service';
import { EstadoFinancieroRequest } from 'src/app/interfaces/requests/estado-financiero-request';
import { UsuarioService } from 'src/app/services/usuario.service';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { ZonaService } from 'src/app/services/zona.service';
import { LocalesService } from 'src/app/services/locales.service';
import { LogoService } from 'src/app/services/logo.service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { EstadoResultadosResponse } from 'src/app/interfaces/responses/estado-resultados-response';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';


@Injectable()
class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.length > 0) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${this._to2digit(day)}/${this._to2digit(month)}/${year}`;
    }
    return date.toDateString();
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }
}

// Definir formato personalizado CON TOKENS NATIVOS
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'input',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

interface TipoReporte {
  id: string;
  nombre: string;
}

interface Zona {
  idZona: number;
  nombre: string;
}

interface Local {
  idLocal: number;
  nombre: string;
}

@Component({
  selector: 'app-estado-financiero',
  templateUrl: './estado-financiero.component.html',
  styleUrls: ['./estado-financiero.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class EstadoFinancieroComponent implements OnInit {
  
  filtrosForm!: FormGroup;
  cargando = false;
  datosReporte: EstadoFinancieroResponse[] | EstadoResultadosResponse[] = [];
  mostrarResultados = false;


  usuarioActual: any = null;
  nombreUsuarioReporte = '';

  logoUrl: string | null = null;

  // Catálogos
  tiposReporte: TipoReporte[] = [
    { id: 'situacion-financiera', nombre: 'Estado de Situación Financiera' },
    { id: 'estado-resultados', nombre: 'Estado de Resultados' } 
    // Agregar más tipos cuando los implementes
  ];

  zonas: Zona[] = [];  
  locales: Local[] = [];

  constructor(
    private fb: FormBuilder,
    private balanceService: BalanceService,
    private dialog: MatDialog,          
    private usuarioService: UsuarioService,
    private zonaService: ZonaService,        
    private localesService: LocalesService,
    private logoService: LogoService 
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();

    //Obtener usuario actual
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    if (this.usuarioActual) {
        this.nombreUsuarioReporte = this.usuarioActual.nombre_usuario  || 'Usuario';
    }
    //CARGAR LOGO
    if (this.usuarioActual?.id_empresa) {
        this.logoService.loadLogoFromEmpresa(this.usuarioActual.id_empresa);
        this.logoService.logoUrl$.subscribe(url => {
        this.logoUrl = url;
        });
    }
    
    //CARGAR ZONAS Y LOCALES
    this.cargarZonas();
    this.cargarLocales();
  }

  inicializarFormulario(): void {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.filtrosForm = this.fb.group({
      fechaDesde: [primerDiaMes, Validators.required],
      fechaHasta: [hoy, Validators.required],
      tipoReporte: ['situacion-financiera', Validators.required],
      idZona: [0],
      idLocal: [0],
      mostrarCodigos: [true] // Checkbox para mostrar/ocultar códigos
    });
  }

  buscarDatos(): void {
    
    if (this.filtrosForm.invalid) {
        this.mostrarMensaje({
        title: 'Formulario incompleto',
        message: 'Por favor completa todos los campos requeridos',
        type: 'warning',
        confirmText: 'Aceptar',
        showCancel: false
        });
        return;
    }

    this.cargando = true;
    const formValue = this.filtrosForm.value;

    const request: EstadoFinancieroRequest = {
        fechaDesde: this.formatearFechaISO(formValue.fechaDesde),
        fechaHasta: this.formatearFechaISO(formValue.fechaHasta),
        idEmpresa: this.usuarioActual?.id_empresa || 1,
        idLocal: formValue.idLocal > 0 ? formValue.idLocal : null,
        idZona: formValue.idZona > 0 ? formValue.idZona : null,
        idCentroCosto: null,
        idProyecto: null,
        idSubproyecto: null
    };

    // ✅ Determinar qué servicio llamar según tipo de reporte
    const tipoReporte = formValue.tipoReporte;
    
    if (tipoReporte === 'estado-resultados') {
        // Llamar servicio de Estado de Resultados
        this.balanceService.getEstadoResultados(request).subscribe({
        next: (response) => {  // ✅ Sin tipado explícito
            this.handleSuccessResponse(response);
        },
        error: (error) => {  // ✅ Sin tipado explícito
            this.handleErrorResponse(error);
        }
        });
    } else {
        // Llamar servicio de Estado Financiero
        this.balanceService.getEstadoFinanciero(request).subscribe({
        next: (response) => {  // ✅ Sin tipado explícito
            this.handleSuccessResponse(response);
        },
        error: (error) => {  // ✅ Sin tipado explícito
            this.handleErrorResponse(error);
        }
        });
    }
    }


  exportarPDF(): void {
    if (!this.datosReporte || this.datosReporte.length === 0) {
        this.mostrarMensaje({
        title: 'Sin datos',
        message: 'No hay datos para exportar. Realiza una búsqueda primero.',
        type: 'warning',
        confirmText: 'Aceptar',
        showCancel: false
        });
        return;
    }

    try {
        const doc = new jsPDF('landscape');
        const mostrarCodigos = this.filtrosForm.get('mostrarCodigos')?.value;
        
        // ========== LOGO (si existe) ==========
        let yPosition = 15;
        if (this.logoUrl) {
        try {
            // Cargar logo como imagen
            const img = new Image();
            img.src = this.logoUrl;
            doc.addImage(img, 'PNG', 14, 10, 30, 15); // x, y, width, height
        } catch (error) {
            console.warn('No se pudo cargar el logo:', error);
        }
        }
        // ========== ENCABEZADO ==========
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const tituloReporte = this.esEstadoResultados() ? 'ESTADO DE RESULTADOS' : 'ESTADO DE SITUACIÓN FINANCIERA';
        doc.text(tituloReporte, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });        
        
        // Período
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const fechaDesde = this.formatearFechaLegible(this.filtrosForm.get('fechaDesde')?.value);
        const fechaHasta = this.formatearFechaLegible(this.filtrosForm.get('fechaHasta')?.value);
        doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, doc.internal.pageSize.getWidth() / 2, 23, { align: 'center' });

        // ========== INFORMACIÓN DEL REPORTE ==========
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const zonaNombre = this.zonas.find(z => z.idZona === this.filtrosForm.get('idZona')?.value)?.nombre || 'Todas';
        const localNombre = this.locales.find(l => l.idLocal === this.filtrosForm.get('idLocal')?.value)?.nombre || 'Todos';
        
        const fechaGeneracion = this.formatearFechaLegible(new Date());
        const horaGeneracion = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
        
        // Información izquierda
        doc.text(`Generado por: ${this.nombreUsuarioReporte}`, 14, 30);
        doc.text(`Fecha: ${fechaGeneracion} ${horaGeneracion}`, 14, 35);
        
        // Información derecha
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text(`Zona: ${zonaNombre}`, pageWidth - 14, 30, { align: 'right' });
        doc.text(`Local: ${localNombre}`, pageWidth - 14, 35, { align: 'right' });

        // Línea separadora
        doc.setDrawColor(0, 44, 108);
        doc.setLineWidth(0.5);
        doc.line(14, 38, pageWidth - 14, 38);

        // ========== PREPARAR DATOS ========== ENCABEZADOS NIVEL     
        const headers = this.esEstadoResultados()
        ? (mostrarCodigos 
            ? [['CUENTA', 'NOMBRE DE LA CUENTA', 'SALDO MENSUAL', 'SALDO ACUMULADO']]
            : [['NOMBRE DE LA CUENTA', 'SALDO MENSUAL', 'SALDO ACUMULADO']])
        : (mostrarCodigos 
            ? [['CUENTA', 'NOMBRE DE LA CUENTA', '', '', '', '', '']]
            : [['NOMBRE DE LA CUENTA', '', '', '', '', '']]);

        const body = this.datosReporte.map(item => {
        const esTotal = item.esTotalGeneral || item.esUtilidad;
        
        let prefijo = '';
        if (!esTotal) {
            if (item.nivel === 1) {
            prefijo = '';
            } else if (item.nivel === 2) {
            prefijo = '  * ';
            } else if (item.nivel === 3) {
            prefijo = '    ** ';
            } else if (item.nivel === 4) {
            prefijo = '      *** ';
            } else if (item.nivel === 5) {
            prefijo = '        ***_ ';
            }
        }
        
        const nombre = prefijo + item.nombreCuenta;
        
        // ✅ Verificar tipo de reporte
        if (this.esEstadoResultados() && this.esEstadoResultadosData(this.datosReporte)) {
            const itemResultados = item as EstadoResultadosResponse;
            if (mostrarCodigos) {
            return [
                itemResultados.cuenta,
                nombre,
                itemResultados.saldoMensual || '',
                itemResultados.saldoAcumulado || ''
            ];
            } else {
            return [
                nombre,
                itemResultados.saldoMensual || '',
                itemResultados.saldoAcumulado || ''
            ];
            }
        } else {
            const itemFinanciero = item as EstadoFinancieroResponse;
            if (mostrarCodigos) {
            return [
                itemFinanciero.cuenta,
                nombre,
                itemFinanciero.sum1 || '',
                itemFinanciero.sum2 || '',
                itemFinanciero.sum3 || '',
                itemFinanciero.sum4 || '',
                itemFinanciero.sum5 || ''
            ];
            } else {
            return [
                nombre,
                itemFinanciero.sum1 || '',
                itemFinanciero.sum2 || '',
                itemFinanciero.sum3 || '',
                itemFinanciero.sum4 || '',
                itemFinanciero.sum5 || ''
            ];
            }
        }
        });
        // ========== GENERAR TABLA SIN BORDES ==========
        autoTable(doc, {
        head: headers,
        body: body,
        startY: 42,
        theme: 'plain',
        styles: {
            fontSize: 8,
            cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
            overflow: 'linebreak',
            lineColor: [255, 255, 255],
            lineWidth: 0
        },
        headStyles: {
            fillColor: [0, 44, 108],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [255, 255, 255]
        },
        columnStyles: mostrarCodigos ? {
            0: { cellWidth: 30, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 28
            3: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 28
            4: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 28
            5: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 28
            6: { cellWidth: 34, halign: 'right', fontStyle: 'normal' }   // era 28
        } : {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 30
            2: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 30
            3: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 30
            4: { cellWidth: 34, halign: 'right', fontStyle: 'normal' },  // era 30
            5: { cellWidth: 34, halign: 'right', fontStyle: 'normal' }   // era 30
        },
        didParseCell: (data) => {
            const rowData = this.datosReporte[data.row.index];
            if (rowData) {
            // ESTILOS PARA TOTALES GENERALES
            if (rowData.esTotalGeneral) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
                data.cell.styles.fillColor = [220, 230, 241]; // Azul claro
                data.cell.styles.textColor = [0, 44, 108];
                
                data.cell.styles.cellPadding = { top: 6, right: 4, bottom: 3, left: 4 };
            }
            // ESTILOS PARA UTILIDAD
            else if (rowData.esUtilidad) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 11;
                data.cell.styles.fillColor = [242, 112, 70]; // Naranja corporativo
                data.cell.styles.textColor = [255, 255, 255];
                
                // Líneas arriba y abajo
                data.cell.styles.lineWidth = { top: 2, bottom: 2, left: 0, right: 0 };
                data.cell.styles.cellPadding = { top: 8, right: 4, bottom: 8, left: 4 };
            }
            // Estilos para cuentas normales
            else if (rowData.nivel === 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
                data.cell.styles.fillColor = [240, 244, 248];
                data.cell.styles.textColor = [0, 44, 108];
            } else if (rowData.nivel === 2) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 9;
                data.cell.styles.fillColor = [248, 250, 252];
            } else if (rowData.nivel === 3) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 8;
            } else if (rowData.nivel === 4) {
                data.cell.styles.fontSize = 8;
            } else if (rowData.nivel === 5) {
                data.cell.styles.fontSize = 7.5;
                data.cell.styles.textColor = [60, 60, 60];
            }
            }
        },
        didDrawCell: (data) => {
        const rowData = this.datosReporte[data.row.index];
        if (rowData) {
            // Línea superior para totales generales
            if (rowData.esTotalGeneral && data.row.index > 0) {
            const prevRow = this.datosReporte[data.row.index - 1];
            if (!prevRow.esTotalGeneral) {
                doc.setDrawColor(0, 44, 108);
                doc.setLineWidth(1);
                const y = data.cell.y;
                doc.line(data.cell.x, y, data.cell.x + data.cell.width, y);
            }
            }
            
            // Líneas arriba y abajo para utilidad
            if (rowData.esUtilidad) {
            doc.setDrawColor(0, 44, 108);
            doc.setLineWidth(2);
            
            // Línea superior
            const yTop = data.cell.y;
            doc.line(data.cell.x, yTop, data.cell.x + data.cell.width, yTop);
            
            // Línea inferior
            const yBottom = data.cell.y + data.cell.height;
            doc.line(data.cell.x, yBottom, data.cell.x + data.cell.width, yBottom);
            }
        }
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        }
        });

        // ========== PIE DE PÁGINA ==========
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
        }

        // ========== GUARDAR ARCHIVO ==========
        const nombreArchivo = `Estado_Financiero_${fechaDesde}_${fechaHasta}.pdf`;
        doc.save(nombreArchivo);

        this.mostrarMensaje({
        title: 'PDF generado',
        message: 'El archivo se ha descargado correctamente',
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
        });

    } catch (error) {
        console.error('Error al generar PDF:', error);
        this.mostrarMensaje({
        title: 'Error',
        message: 'Ocurrió un error al generar el PDF',
        type: 'error',
        confirmText: 'Aceptar',
        showCancel: false
        });
    }
    }

  exportarExcel(): void {
    if (!this.datosReporte || this.datosReporte.length === 0) {
        this.mostrarMensaje({
        title: 'Sin datos',
        message: 'No hay datos para exportar. Realiza una búsqueda primero.',
        type: 'warning',
        confirmText: 'Aceptar',
        showCancel: false
        });
        return;
    }

    try {
        const mostrarCodigos = this.filtrosForm.get('mostrarCodigos')?.value;
        
        // ========== INFORMACIÓN DEL REPORTE ==========
        const fechaDesde = this.formatearFechaLegible(this.filtrosForm.get('fechaDesde')?.value);
        const fechaHasta = this.formatearFechaLegible(this.filtrosForm.get('fechaHasta')?.value);
        const zonaNombre = this.zonas.find(z => z.idZona === this.filtrosForm.get('idZona')?.value)?.nombre || 'Todas';
        const localNombre = this.locales.find(l => l.idLocal === this.filtrosForm.get('idLocal')?.value)?.nombre || 'Todos';
        const fechaGeneracion = this.formatearFechaLegible(new Date());
        const horaGeneracion = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
        
        // ========== ENCABEZADOS DEL REPORTE ==========
        const infoReporte = [
        [this.esEstadoResultados() ? 'ESTADO DE RESULTADOS' : 'ESTADO DE SITUACIÓN FINANCIERA'],
        [`Período: ${fechaDesde} al ${fechaHasta}`],
        [''],
        [`Generado por: ${this.nombreUsuarioReporte}`, '', '', `Zona: ${zonaNombre}`],
        [`Fecha: ${fechaGeneracion} ${horaGeneracion}`, '', '', `Local: ${localNombre}`],
        ['']
        ];
        
        // ========== PREPARAR DATOS ==========       
        const datos = this.datosReporte.map(item => {
        const esTotal = item.esTotalGeneral || item.esUtilidad;
        
        let prefijo = '';
        if (!esTotal) {
            if (item.nivel === 2) prefijo = '  ';
            else if (item.nivel === 3) prefijo = '    ';
            else if (item.nivel === 4) prefijo = '      ';
            else if (item.nivel === 5) prefijo = '        ';
        }
        
        const nombre = prefijo + item.nombreCuenta;
        
        const row: any = {};
        
        if (mostrarCodigos) {
            row['CUENTA'] = item.cuenta;
        }
        
        row['NOMBRE DE LA CUENTA'] = nombre;
        
        // Verificar tipo de reporte
        if (this.esEstadoResultados() && this.esEstadoResultadosData(this.datosReporte)) {
            const itemResultados = item as EstadoResultadosResponse;
            row['SALDO MENSUAL'] = itemResultados.saldoMensual || '';
            row['SALDO ACUMULADO'] = itemResultados.saldoAcumulado || '';
        } else {
            const itemFinanciero = item as EstadoFinancieroResponse;
            row['NIVEL 1'] = itemFinanciero.sum1 || '';
            row['NIVEL 2'] = itemFinanciero.sum2 || '';
            row['NIVEL 3'] = itemFinanciero.sum3 || '';
            row['NIVEL 4'] = itemFinanciero.sum4 || '';
            row['NIVEL 5'] = itemFinanciero.sum5 || '';
        }
        
        return row;
        });

        // ========== CREAR WORKSHEET ==========
        const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(infoReporte);
        
        // Agregar los datos después de la info
        XLSX.utils.sheet_add_json(ws, datos, { origin: -1, skipHeader: false });

        // ========== ESTILOS Y FORMATO ==========
        // Ajustar anchos de columna
        const colWidths = mostrarCodigos 
        ? [{ wch: 18 }, { wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        : [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        ws['!cols'] = colWidths;

        // Mergear celdas del título
        ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: mostrarCodigos ? 6 : 5 } }, // Título
        { s: { r: 1, c: 0 }, e: { r: 1, c: mostrarCodigos ? 6 : 5 } }  // Período
        ];

        // ========== CREAR WORKBOOK ==========
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Estado Financiero');

        // ========== GUARDAR ARCHIVO ==========
        const nombreArchivo = `Estado_Financiero_${fechaDesde}_${fechaHasta}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        this.mostrarMensaje({
        title: 'Excel generado',
        message: 'El archivo se ha descargado correctamente',
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
        });

    } catch (error) {
        console.error('Error al generar Excel:', error);
        this.mostrarMensaje({
        title: 'Error',
        message: 'Ocurrió un error al generar el Excel',
        type: 'error',
        confirmText: 'Aceptar',
        showCancel: false
        });
    }
    }

  // Métodos auxiliares
    formatearFechaISO(fecha: any): string {
    // Asegurar que sea un objeto Date válido
    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    
    // Formatear manualmente sin cambio de timezone
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}T00:00:00`;
    }

  formatearFechaLegible(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}-${mes}-${anio}`;
  }

  private cargarZonas(): void {
    this.zonaService.obtenerZona().subscribe({
        next: (zonas) => {
        this.zonas = [
            { idZona: 0, nombre: 'Todas las zonas' },
            ...zonas.map(z => ({ idZona: z.id, nombre: z.nombre }))
        ];
        },
        error: (error) => {
        console.error('Error al cargar zonas:', error);
        this.zonas = [{ idZona: 0, nombre: 'Todas las zonas' }];
        }
    });
    }

    private cargarLocales(): void {
        this.localesService.getAll().subscribe({
            next: (response) => {
            console.log('Response completo:', response); // VER ESTRUCTURA COMPLETA
            console.log('Response.data:', response.data); // VER DATA
            
            // Verifica si response.data es array
            if (Array.isArray(response.data)) {
                this.locales = [
                { idLocal: 0, nombre: 'Todos los locales' },
                ...response.data.map((l: any) => {
                    console.log('Local individual:', l); //VER CADA LOCAL
                    return {
                    idLocal: l.idLocal || l.IdLocal || l.id_local || l.id, // Probar variaciones
                    nombre: l.nombre || l.Nombre || l.descripcion || l.Descripcion
                    };
                })
                ];
            } else {
                console.error('response.data NO es un array:', response.data);
                this.locales = [{ idLocal: 0, nombre: 'Todos los locales' }];
            }
            
            console.log('Locales procesados:', this.locales); // VER RESULTADO FINAL
            },
            error: (error) => {
            console.error('Error al cargar locales:', error);
            this.locales = [{ idLocal: 0, nombre: 'Todos los locales' }];
            }
        });
    }

    private handleSuccessResponse(response: any): void {  // ✅ Usar 'any' para evitar conflictos
    this.cargando = false;
    if (response.data && response.data.length > 0) {

        this.datosReporte = response.data.filter((item: any) => {
            if (item.esUtilidad && !this.esEstadoResultados()) {
                //Solo filtrar utilidad vacía en Situación Financiera
                const tieneValor = ['sum1','sum2','sum3','sum4','sum5']
                    .some(k => item[k] && item[k].toString().trim() !== '');
                return tieneValor;
            }
            return true; // Estado de Resultados y todo lo demás pasa siempre
        });

        if (this.esEstadoResultados()) {
            (this.datosReporte as EstadoResultadosResponse[]).forEach(item => {
                if (!item.esUtilidad && !item.esTotalGeneral) {
                    item.saldoMensual   = this.invertirFormato(item.saldoMensual);
                    item.saldoAcumulado = this.invertirFormato(item.saldoAcumulado);
                }
            });
        }

        if (!this.esEstadoResultados()) {
            this.agregarTotalPasivoPatrimonio();
        }
        else {
            this.agregarTotalesResultados(); // NUEVO
        }

        this.mostrarResultados = true;
        
        this.mostrarMensaje({
        title: 'Datos cargados',
        message: `Se encontraron ${response.data.length} registros`,
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
        });
    } else {
        this.datosReporte = [];
        this.mostrarResultados = false;
        
        this.mostrarMensaje({
        title: 'Sin resultados',
        message: 'No se encontraron datos para los filtros seleccionados',
        type: 'info',
        confirmText: 'Aceptar',
        showCancel: false
        });
    }
    }

    private agregarTotalPasivoPatrimonio(): void {
        const datos = this.datosReporte as EstadoFinancieroResponse[];

        const totalActivo = datos.find(d =>
            d.nivel === 1 && d.nombreCuenta.toUpperCase().includes('ACTIVO'));
        const totalPasivo = datos.find(d =>
            d.nivel === 1 && d.nombreCuenta.toUpperCase().includes('PASIVO'));
        const totalPatrimonio = datos.find(d =>
            d.nivel === 1 && d.nombreCuenta.toUpperCase().includes('PATRIMONIO'));

        if (!totalPasivo && !totalPatrimonio) return;

        const parsear = (v: string | null | undefined): number => {
            if (!v) return 0;
            const esNeg = v.includes('(');
            const limpio = v.replace(/[()]/g, '')
                            .replace(/\s/g, '')
                            .replace(/\./g, '')
                            .replace(/,/g, '.');  // fix
            const num = parseFloat(limpio) || 0;
            return esNeg ? -num : num;
        };

        const formatear = (n: number): string => {
            if (n === 0) return '';
            if (n < 0) return `(${Math.abs(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const filaUtilidad = datos.find(d => d.esUtilidad);

        // Inyectar cuentas 370xxx para mostrar utilidad en patrimonio
        if (filaUtilidad) {
            const utilidadValor = parsear(filaUtilidad.sum1);

            if (utilidadValor !== 0) {
                const utilidadFormateada = formatear(-Math.abs(utilidadValor));

                let cuenta370000000 = datos.find(d => d.cuenta === '370000-000');
                let cuenta370100000 = datos.find(d => d.cuenta === '370100-000');
                let cuenta370101000 = datos.find(d => d.cuenta === '370101-000');
                let cuenta370101001 = datos.find(d => d.cuenta === '370101-001');

                if (!cuenta370000000) cuenta370000000 = { cuenta: '370000-000', nombreCuenta: 'RESULTADOS DEL EJERCICIO', nivel: 2, orden: 8000, esTotalGeneral: false, esUtilidad: false, sum1: '', sum2: '', sum3: '', sum4: '', sum5: '' };
                if (!cuenta370100000) cuenta370100000 = { cuenta: '370100-000', nombreCuenta: 'GANANCIA NETA DEL PERIODO', nivel: 3, orden: 8001, esTotalGeneral: false, esUtilidad: false, sum1: '', sum2: '', sum3: '', sum4: '', sum5: '' };
                if (!cuenta370101000) cuenta370101000 = { cuenta: '370101-000', nombreCuenta: 'GANANCIA NETA DEL PERIODO', nivel: 4, orden: 8002, esTotalGeneral: false, esUtilidad: false, sum1: '', sum2: '', sum3: '', sum4: '', sum5: '' };
                if (!cuenta370101001) cuenta370101001 = { cuenta: '370101-001', nombreCuenta: 'GANANCIA DEL EJERCICIO', nivel: 5, orden: 8003, esTotalGeneral: false, esUtilidad: false, sum1: '', sum2: '', sum3: '', sum4: '', sum5: '' };

                cuenta370000000.sum2 = utilidadFormateada;
                cuenta370100000.sum3 = utilidadFormateada;
                cuenta370101000.sum4 = utilidadFormateada;
                cuenta370101001.sum5 = utilidadFormateada;

                const indexUtilidad = datos.findIndex(d => d.esUtilidad);
                if (indexUtilidad >= 0) {
                    const cuentasNuevas = [cuenta370000000, cuenta370100000, cuenta370101000, cuenta370101001]
                        .filter(c => !datos.includes(c));
                    if (cuentasNuevas.length > 0) {
                        (this.datosReporte as EstadoFinancieroResponse[]).splice(indexUtilidad, 0, ...cuentasNuevas);
                    }
                }

                // ✅ Recalcular patrimonio sumando nivel 2 existentes + utilidad
                // El backend ya trae 300000-000 correcto SIN utilidad del período
                // Solo necesitamos sumar la utilidad al patrimonio existente
                if (totalPatrimonio) {
                    const patrimonioSinUtilidad = parsear(totalPatrimonio.sum1);
                    totalPatrimonio.sum1 = formatear(patrimonioSinUtilidad + (-Math.abs(utilidadValor)));
                }
            }
        }

        // Calcular TOTAL PASIVO + PATRIMONIO
        const pasivo = parsear(totalPasivo?.sum1) || 0;
        const patrimonio = parsear(totalPatrimonio?.sum1) || 0;
        const totalPasivoPatrimonio = Math.abs(pasivo) + Math.abs(patrimonio);

        const filaActivo: EstadoFinancieroResponse = {
            cuenta: '', nombreCuenta: 'TOTAL ACTIVOS', nivel: 1, orden: 9998,
            esTotalGeneral: true, esUtilidad: false,
            sum1: totalActivo?.sum1 ?? '', sum2: '', sum3: '', sum4: '', sum5: ''
        };

        const filaTotal: EstadoFinancieroResponse = {
            cuenta: '', nombreCuenta: 'TOTAL PASIVO + PATRIMONIO', nivel: 1, orden: 9999,
            esTotalGeneral: true, esUtilidad: false,
            sum1: formatear(totalPasivoPatrimonio), sum2: '', sum3: '', sum4: '', sum5: ''
        };

        const indexUtilidadFinal = datos.findIndex(d => d.esUtilidad);
        let filaUtilidadRemovida: EstadoFinancieroResponse | undefined;

        if (indexUtilidadFinal >= 0) {
            filaUtilidadRemovida = datos[indexUtilidadFinal];
            (this.datosReporte as EstadoFinancieroResponse[]).splice(indexUtilidadFinal, 1);
        }

        if (indexUtilidadFinal >= 0) {
            (this.datosReporte as EstadoFinancieroResponse[]).splice(indexUtilidadFinal, 0, filaActivo, filaTotal);
        } else {
            const ultimoTotal = totalPatrimonio || totalPasivo;
            const index = datos.indexOf(ultimoTotal!);
            (this.datosReporte as EstadoFinancieroResponse[]).splice(index + 1, 0, filaActivo, filaTotal);
        }

        if (filaUtilidadRemovida) {
            (this.datosReporte as EstadoFinancieroResponse[]).push(filaUtilidadRemovida);
        }
    }

    private agregarTotalesResultados(): void {
        const datos = this.datosReporte as EstadoResultadosResponse[];
        const filaUtilidad = datos.find(d => d.esUtilidad);
        if (!filaUtilidad) return;

        const parsear = (v: string | null | undefined): number => {
            if (!v) return 0;
            const esNeg = v.includes('(');
            
            // ✅ Formato EUROPEO: punto = miles, coma = decimal (igual que el backend)
            const limpio = v.replace(/[()]/g, '')     // Quita paréntesis
                            .replace(/\s/g, '')       // Quita espacios
                            .replace(/\./g, '')       // Quita puntos (miles)
                            .replace(/,/g, '.');      // Coma → punto (decimal)
            
            const num = parseFloat(limpio) || 0;
            return esNeg ? -num : num;
        };

        const formatear = (n: number): string => {
            if (n === 0) return '';
            if (n < 0) return `(${Math.abs(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Recalcular desde las filas nivel 1 reales
        const cuentasNivel1 = datos.filter(d => d.nivel === 1 && !d.esTotalGeneral && !d.esUtilidad);
        const ingresos = cuentasNivel1.filter(d => d.cuenta?.startsWith('4'));
        const gastos   = cuentasNivel1.filter(d => ['5','6','7'].some(p => d.cuenta?.startsWith(p)));

        const totalIngMensual    = ingresos.reduce((acc, f) => acc + parsear(f.saldoMensual), 0);
        const totalIngAcumulado  = ingresos.reduce((acc, f) => acc + parsear(f.saldoAcumulado), 0);
        const totalGasMensual    = gastos.reduce((acc, f) => acc + parsear(f.saldoMensual), 0);   // negativo
        const totalGasAcumulado  = gastos.reduce((acc, f) => acc + parsear(f.saldoAcumulado), 0); // negativo

        //UTILIDAD Ingresos + Gastos (gastos negativos) — coincide con el backend
        // No uses filaUtilidad del backend para recalcular, úsala solo para validar
        const filaTotalIngresos: EstadoResultadosResponse = {
            cuenta: '', nombreCuenta: 'TOTAL INGRESOS', nivel: 1, orden: 9997,
            esTotalGeneral: true, esUtilidad: false,
            saldoMensual:   formatear(totalIngMensual),
            saldoAcumulado: formatear(totalIngAcumulado),
        };

        const filaTotalGastos: EstadoResultadosResponse = {
            cuenta: '', nombreCuenta: 'TOTAL GASTOS', nivel: 1, orden: 9998,
            esTotalGeneral: true, esUtilidad: false,
            saldoMensual:   formatear(Math.abs(totalGasMensual)),   // mostrar positivo
            saldoAcumulado: formatear(Math.abs(totalGasAcumulado)),
        };

        //Actualizar la fila utilidad con el valor recalculado en frontend (consistencia visual)
        filaUtilidad.saldoMensual   = formatear(totalIngMensual + totalGasMensual);
        filaUtilidad.saldoAcumulado = formatear(totalIngAcumulado + totalGasAcumulado);

        const indexUtilidad = datos.findIndex(d => d.esUtilidad);
        let filaUtilidadResultados: EstadoResultadosResponse | undefined;

        if (indexUtilidad >= 0) {
            filaUtilidadResultados = datos[indexUtilidad];
            (this.datosReporte as EstadoResultadosResponse[]).splice(indexUtilidad, 1);
        }

        //AGREGAR los totales donde estaba la utilidad
        if (indexUtilidad >= 0) {
            (this.datosReporte as EstadoResultadosResponse[]).splice(
                indexUtilidad, 0, filaTotalIngresos, filaTotalGastos
            );
        } else {
            (this.datosReporte as EstadoResultadosResponse[]).push(filaTotalIngresos, filaTotalGastos);
        }

        //VOLVER A AGREGAR la utilidad AL FINAL
        if (filaUtilidadResultados) {
            (this.datosReporte as EstadoResultadosResponse[]).push(filaUtilidadResultados);
        }
    }

    // NUEVO: Método para manejar errores
    private handleErrorResponse(error: any): void {
    this.cargando = false;
    console.error('Error al consultar estado financiero:', error);
    
    this.mostrarMensaje({
        title: 'Error',
        message: 'Ocurrió un error al consultar los datos. Por favor intenta nuevamente.',
        type: 'error',
        confirmText: 'Aceptar',
        showCancel: false
    });
    }

    // Ya no se necesita formatear porque viene formateado del backend    
    formatearNumero(valor: string | null): string {
    if (!valor) return '';
    return valor; // Ya viene formateado con paréntesis del backend
    }
    
  limpiarFormulario(): void {
    this.filtrosForm.reset();
    this.inicializarFormulario();
    this.datosReporte = [];
    this.mostrarResultados = false;
  }
  esEstadoResultados(): boolean {
    return this.filtrosForm.get('tipoReporte')?.value === 'estado-resultados';
    }

    esEstadoResultadosData(data: any[]): data is EstadoResultadosResponse[] {
    return data.length > 0 && 'saldoMensual' in data[0];
    }
  private mostrarMensaje(data: MessageBoxData): Promise<boolean> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
        data: data,
        width: '400px',
        disableClose: data.isLoading || false
    });
    return dialogRef.afterClosed().toPromise();
    }
    private invertirFormato(v: string | null | undefined): string {
        if (!v || v.trim() === '') return '';
        if (v.includes('(')) {
            // Tenía paréntesis → quitar (mostrar positivo)
            return v.replace(/[()]/g, '');
        } else {
            // No tenía paréntesis → agregar (mostrar negativo)
            return `(${v})`;
        }
    }
}