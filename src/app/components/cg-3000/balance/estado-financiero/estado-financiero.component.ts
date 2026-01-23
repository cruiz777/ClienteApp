import { Component, OnInit } from '@angular/core';
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
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';

// Definir formato personalizado CON TOKENS NATIVOS
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
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
    { 
      provide: DateAdapter, 
      useClass: MomentDateAdapter, 
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS] 
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class EstadoFinancieroComponent implements OnInit {
  
  filtrosForm!: FormGroup;
  cargando = false;
  datosReporte: EstadoFinancieroResponse[] = [];
  mostrarResultados = false;


  usuarioActual: any = null;
  nombreUsuarioReporte = '';

  logoUrl: string | null = null;

  // Catálogos
  tiposReporte: TipoReporte[] = [
    { id: 'situacion-financiera', nombre: 'Estado de Situación Financiera' }
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
        this.nombreUsuarioReporte = this.usuarioActual.nombreD || 'Usuario';
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
        idEmpresa: this.usuarioActual?.id_empresa || 1, // ✅ Usar empresa del usuario
        idLocal: formValue.idLocal > 0 ? formValue.idLocal : null,
        idZona: formValue.idZona > 0 ? formValue.idZona : null,
        idCentroCosto: null,
        idProyecto: null,
        idSubproyecto: null
    };

    this.balanceService.getEstadoFinanciero(request).subscribe({
        next: (response) => {
        this.cargando = false;
        if (response.data && response.data.length > 0) {
            this.datosReporte = response.data;
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
        },
        error: (error) => {
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
    });
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
        doc.text('ESTADO DE SITUACIÓN FINANCIERA', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
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
        const headers = mostrarCodigos 
        ? [['CUENTA', 'NOMBRE DE LA CUENTA', '', '', '', '', '']]
        : [['NOMBRE DE LA CUENTA', '', '', '', '', '']];

        const body = this.datosReporte.map(item => {
        // Indentación más visual con símbolos
        let prefijo = '';
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
        
        const nombre = prefijo + item.nombreCuenta;
        
        if (mostrarCodigos) {
            return [
            item.cuenta,
            nombre,
            this.formatearNumero(item.sum1),
            this.formatearNumero(item.sum2),
            this.formatearNumero(item.sum3),
            this.formatearNumero(item.sum4),
            this.formatearNumero(item.sum5)
            ];
        } else {
            return [
            nombre,
            this.formatearNumero(item.sum1),
            this.formatearNumero(item.sum2),
            this.formatearNumero(item.sum3),
            this.formatearNumero(item.sum4),
            this.formatearNumero(item.sum5)
            ];
        }
        });

        // ========== GENERAR TABLA SIN BORDES ==========
        autoTable(doc, {
        head: headers,
        body: body,
        startY: 42,
        theme: 'plain', // ✅ CAMBIO: 'plain' = sin bordes en celdas
        styles: {
            fontSize: 8,
            cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
            overflow: 'linebreak',
            lineColor: [255, 255, 255], // Bordes blancos = invisibles
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
            2: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
            4: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
            5: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
            6: { cellWidth: 28, halign: 'right', fontStyle: 'normal' }
        } : {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 30, halign: 'right', fontStyle: 'normal' },
            2: { cellWidth: 30, halign: 'right', fontStyle: 'normal' },
            3: { cellWidth: 30, halign: 'right', fontStyle: 'normal' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'normal' },
            5: { cellWidth: 30, halign: 'right', fontStyle: 'normal' }
        },
        didParseCell: (data) => {
            const rowData = this.datosReporte[data.row.index];
            if (rowData) {
            // Estilo según nivel
            if (rowData.nivel === 1) {
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
        alternateRowStyles: {
            fillColor: [255, 255, 255] // Quitar filas alternas
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
        ['ESTADO DE SITUACIÓN FINANCIERA'],
        [`Período: ${fechaDesde} al ${fechaHasta}`],
        [''],
        [`Generado por: ${this.nombreUsuarioReporte}`, '', '', `Zona: ${zonaNombre}`],
        [`Fecha: ${fechaGeneracion} ${horaGeneracion}`, '', '', `Local: ${localNombre}`],
        ['']
        ];
        
        // ========== PREPARAR DATOS ==========
        const datos = this.datosReporte.map(item => {
        // Indentación con espacios
        let prefijo = '';
        if (item.nivel === 2) prefijo = '  ';
        else if (item.nivel === 3) prefijo = '    ';
        else if (item.nivel === 4) prefijo = '      ';
        else if (item.nivel === 5) prefijo = '        ';
        
        const nombre = prefijo + item.nombreCuenta;
        
        const row: any = {};
        
        if (mostrarCodigos) {
            row['CUENTA'] = item.cuenta;
        }
        
        row['NOMBRE DE LA CUENTA'] = nombre;
        row[''] = item.sum1 !== null ? item.sum1 : '';
        row[''] = item.sum2 !== null ? item.sum2 : '';
        row[''] = item.sum3 !== null ? item.sum3 : '';
        row[''] = item.sum4 !== null ? item.sum4 : '';
        row[''] = item.sum5 !== null ? item.sum5 : '';
        
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
  formatearFechaISO(fecha: Date): string {
    return fecha.toISOString();
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
  formatearNumero(valor: number | null): string {
    if (valor === null || valor === undefined) {
      return '';
    }
    return valor.toLocaleString('es-EC', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  limpiarFormulario(): void {
    this.filtrosForm.reset();
    this.inicializarFormulario();
    this.datosReporte = [];
    this.mostrarResultados = false;
  }
  private mostrarMensaje(data: MessageBoxData): Promise<boolean> {
    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
        data: data,
        width: '400px',
        disableClose: data.isLoading || false
    });
    return dialogRef.afterClosed().toPromise();
    }
}