import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AgGridModule } from 'ag-grid-angular';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { ProductoService, Producto } from 'src/app/services/producto.service';
import { Codigos14Service } from 'src/app/services/codigos14.service';
import { GridApi, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { LOCALE_ID } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import jsPDF from 'jspdf';
import { de } from 'intl-tel-input/i18n';

import { ReporteUnidadLogisticaService } from 'src/app/services/reporte.service';
import { ExportService } from 'src/app/services/export.service';
import { ReporteUnidadLogisticaParams } from 'src/app/interfaces/responses/producto-reporte-response';
import { GlnService } from 'src/app/services/gln.service';
import { GS1ExportService } from 'src/app/services/gs1-export.service';

import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';


export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY'
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

@Component({
  selector: 'app-nuevo-producto',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AgGridModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatRadioModule
  ],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.css',

  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class NuevoProductoComponent implements OnInit {
  formReporte!: FormGroup; // ✅ declara la propiedad correctamente
  gridOptions: GridOptions = {
    getRowId: (params: any) => params.data.codbar
  };
  activeTab: string = 'Listado';
  clienteSeleccionado: Cliente | null = null;
  filtroPrefijo: string = '';
  busqueda: string = '';
  cantidadMostrar: number = 10;
  registroSeleccionado: any = null;
  codigoSeleccionado: string = '';
  registros: any[] = [];
  registrosGtin14: any[] = [];
  gridApi!: GridApi;
  ultimoClick = 0;
  dobleClickDelay = 480;
  getRowNodeId = (data: any) => data.codbar; // o data.id si prefieres
  prefijos: any[] = [];
mostrarFiltros: boolean = true;

  clienteE!: ClienteIndividual;


  columnDefsUV = [
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      sortable: false,
      filter: false
    },
    { field: 'empresa', headerName: 'Empresa', width: 160 },
    { field: 'prefijo', headerName: 'Prefijo', width: 90 },
    { field: 'tipogtin', headerName: 'Tipo GTIN', width: 100 },
    { field: 'estado', headerName: 'Estado', width: 100 },
    { field: 'codbar', headerName: 'GTIN UV', width: 160 },
    { field: 'presentacion', headerName: 'P', width: 50 },
    { field: 'descripcion', headerName: 'Descripción', width: 180 },
    { field: 'fecha', headerName: 'Fecha', width: 120 },
    { field: 'marca', headerName: 'Marca', width: 120 },
    { field: 'contenido', headerName: 'Contenido', width: 100 },
    { field: 'unidad', headerName: 'Unidad', width: 90 },
    { field: 'categoria', headerName: 'Categoría', width: 120 },
    { field: 'gcp_brick', headerName: 'Brick', width: 100 },
    { field: 'pais', headerName: 'País', width: 80 }
  ];


  columnDefsGtin14 = [
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      sortable: false,
      filter: false
    },
    { field: 'g14', headerName: 'Unidad Logística' },
    { field: 'codbar', headerName: 'Código' },
    { field: 'prefijo', headerName: 'Prefijo' },
    { field: 'factor', headerName: 'Factor' },
    { field: 'presentacion', headerName: 'Presentación' },
    { field: 'descripcion', headerName: 'Descripción' },
    { field: 'fecha', headerName: 'Fecha' },
    { field: 'estado', headerName: 'Estado' }
  ];

  defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  constructor(
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private productoService: ProductoService,
    private codigos14Service: Codigos14Service,
    private _snackBar: MatSnackBar,
    private fb: FormBuilder,
    private prefijoService: PrefijoService,
    private clienteService: ClienteService,
    private reporteService: ReporteUnidadLogisticaService,
    private exportService: ExportService,
    private glnService: GlnService,
    private gs1ExportService: GS1ExportService
  ) { }

  ngOnInit(): void {

    this.formReporte = this.fb.group({
      reporte: ['gtinVenta'],
      certificado: [''],
      certificado1: [''],
      carta: [''],
      gcp: [null],
      codigoCliente: [''],
      operadorFecha: ['igual'],
      estado: ['1'],
      fecha: [new Date()],
      desde: [{ value: new Date(), disabled: true }],
      hasta: [{ value: new Date(), disabled: true }],
      codigo: ['']
    });

    // Suscripción al cambio de operadorFecha
    this.formReporte.get('operadorFecha')?.valueChanges.subscribe(valor => {
      const fechaCtrl = this.formReporte.get('fecha');
      const desdeCtrl = this.formReporte.get('desde');
      const hastaCtrl = this.formReporte.get('hasta');

      if (valor === 'entre') {
        // Desactivar campo "fecha"
        fechaCtrl?.disable();

        // Activar campos "desde" y "hasta"
        desdeCtrl?.enable();
        hastaCtrl?.enable();
      } else {
        // Activar campo "fecha"
        fechaCtrl?.enable();

        // Desactivar campos "desde" y "hasta"
        desdeCtrl?.disable();
        hastaCtrl?.disable();
      }
    });
    this.formReporte.get('reporte')?.valueChanges.subscribe(valor => {
    this.mostrarFiltros = valor !== 'producto';  // ocultar filtros si es "producto"
  });
    this.cargarCliente();
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      if (cliente?.clientes_codigo) {
        this.cargarProductos(cliente.clientes_codigo);
      }
    });

  }

  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  filtrarRegistros() {
    const texto = this.busqueda.trim().toLowerCase();

    return this.registros.filter(r =>
      (!this.filtroPrefijo || r.prefijo.includes(this.filtroPrefijo)) &&
      (!texto || Object.values(r).some(valor =>
        valor && valor.toString().toLowerCase().includes(texto)
      ))
    );
  }

  seleccionarRegistro(registro: any): void {
    this.registroSeleccionado = registro;
    this.codigoSeleccionado = registro.codbar;
    this.cargarCodigos14PorGtin(registro.codbar);

    // Mejor: usa el ID directamente
    if (this.gridApi) {
      const node = this.gridApi.getRowNode(registro.codbar); // ← gracias a getRowNodeId
      if (node) {
        this.gridApi.deselectAll();
        node.setSelected(true);
      }
    }
  }

  abrirVentanaUl(): void {
    if (!this.codigoSeleccionado) {
      this.mostrarAlerta('⚠️ Debe seleccionar un código GTIN primero.', 'Advertencia');
      return;
    }

    // Redirige usando el codbar como parte del path
    this.router.navigateByUrl(`/menuProductos/ul/${this.codigoSeleccionado}`);
  }


  cargarProductos(codigoCliente: number): void {
    this.productoService.getProductosPorCliente(codigoCliente).subscribe({
      next: (productos: Producto[]) => {
        this.registros = productos.map(p => ({
          id: p.IdProducto,
          empresa: p.clienteNombres || '',
          prefijo: p.codpre || '',
          tipogtin: p.gtin || '',
          estado: p.Activo ? 'ACTIVO' : 'INACTIVO',
          codbar: p.codbar || '',
          presentacion: p.p || '',
          descripcion: p.Despro || '',
          fecha: this.formatearFecha(p.Feccre),
          marca: p.marca || '',
          contenido: p.contenido || '',
          unidad: p.unidad || '',
          categoria: p.dbrick || '',
          gcp_brick: p.brick || '',
          pais: p.pais || ''
        }));
      },
      error: err => console.error('Error al cargar productos:', err)
    });
  }

  cargarCodigos14PorGtin(gtin: string): void {
    this.codigos14Service.getPorGtin(gtin).subscribe({
      next: codigos => {
        this.registrosGtin14 = codigos.map(c => ({
          id: c.id_codigos14,
          g14: c.g14 || '',
          codbar: c.codbar || '',
          prefijo: c.codpre || '',
          factor: c.unidad || '',
          presentacion: c.presentacion || 0,
          descripcion: c.descripcion || '',
          fecha: this.formatearFecha(c.fecha),
          estado: c.activo ? 'ACTIVO' : 'INACTIVO'
        }));
      },
      error: err => console.error('Error al cargar códigos14:', err)
    });
  }

  formatearFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  irAUvIndividual(): void {
    this.router.navigate(['/menuProductos/uvIndividual']);
  }

  irBloque(): void {
    this.router.navigate(['/menuProductos/bloque']);
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  seleccionarRegistroU(registro: any) {
    console.log('➡️ Doble clic sobre:', registro); // ✅ Verificación
    if (registro?.codbar) {
      this.router.navigate(['/menuProductos/uvIndividualEdit', registro.codbar]);
    } else {
      console.log('⚠️ codbar no disponible en el registro', registro);
    }
  }


  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }



  manejarClic(data: any): void {
    const ahora = Date.now();
    const diferencia = ahora - this.ultimoClick;

    if (diferencia < this.dobleClickDelay) {
      // 🚀 Doble clic
      this.seleccionarRegistroU(data);
    } else {
      // 👆 Clic normal
      this.seleccionarRegistro(data);
    }

    this.ultimoClick = ahora;
  }
  mostrarAlerta(mensaje: string, tipo: string) {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: "end",
      verticalPosition: "top",
      duration: 3000
    });
  }

  onPrefijoBlur(): void {
    const idSeleccionado = this.formReporte.value.gcp;
    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);

  }

  cargarPrefijos(codigoCliente: number): void {
    this.prefijoService.obtenerPorClienteCodigo(codigoCliente).subscribe({
      next: (data) => {
        this.prefijos = data;
      },
      error: (err) => {
        console.error('Error al cargar prefijos:', err);
      }
    });
  }

  cargarCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log(cliente);
    if (cliente) {
      this.clienteSeleccionado = cliente;
      this.formReporte.patchValue({
        codigoCliente: cliente.clientes_codigo || '',
        cliente: cliente.nomcli || '',
        ruc: cliente.ruc || '',

      });
      this.cargarClientePorId(cliente.clientes_codigo);
      this.cargarPrefijos(cliente.clientes_codigo);
    }
  }
  cargarClientePorId(id: number): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.clienteE = cliente;

      },
      error: (err) => {
        console.error('Error al obtener cliente:', err);
      }
    });
  }
  onOperadorFechaChange(): void {
    const operador = this.formReporte.get('operadorFecha')?.value;
    const fecha = this.formReporte.get('fecha');
    const desde = this.formReporte.get('desde');
    const hasta = this.formReporte.get('hasta');

    if (operador === 'entre') {
      fecha?.disable();
      desde?.enable();
      hasta?.enable();
    } else {
      fecha?.enable();
      desde?.disable();
      hasta?.disable();
    }
  }

  mostrarPrefijo(): boolean {
    const tipo = this.formReporte.get('reporte')?.value;
    return ['gtinVenta', 'logistica', 'carta'].includes(tipo);
  }

  async generarPdfPorProducto(): Promise<void> {
    const logoBase64 = await this.cargarImagenBase64('assets/logo/GS1-logo.png');
    const firmaBase64 = await this.cargarImagenBase64('assets/logo/firma.png');
    const logoWidth = 30;
    const logoHeight = 20;
    const firmaWidth = 50;
    const firmaHeight = 15;

    const codbar = this.formReporte.get('codigo')?.value;

    if (!codbar) {
      this._snackBar.open('⚠️ Debe ingresar un código de barras.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning']
      });
      return;
    }

    this.productoService.buscarPorCodbar(codbar).pipe(take(1)).subscribe({
      next: async (producto) => {
        if (!producto) {
          this._snackBar.open('⚠️ Producto no encontrado.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['snackbar-warning']
          });
          return;
        }

        // Cargar datos del prefijo por codpre
        let gln = '---';
        let web = '---';

        if (producto.codpre) {
          try {
            const prefijos = await firstValueFrom(
              this.prefijoService.buscarPorCodpre(producto.codpre)
            );

            if (prefijos.length > 0) {
              gln = prefijos[0].gln || '---';
              web = prefijos[0].web || '---';
            }
          } catch (error) {
            console.error('❌ Error al obtener prefijos:', error);
          }
        }

        const doc = new jsPDF();
        const logoX = 15;
        const logoY = 10;
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        let y = 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sistema de Control de Códigos', 105, y, { align: 'center' });
        y += 8;
        doc.text('Reporte de Ficha Producto', 105, y, { align: 'center' });
        y += 10;

        const xLabel = 150;
        const xValue = 180;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Emisor :', xLabel, y); doc.text('GS1', xValue, y); y += 5;
        const hoy = new Date();
        const fecha = `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
        doc.text('Fecha de Emisión:', xLabel, y); doc.text(fecha, xValue, y); y += 5;
        doc.text('Pag.:', xLabel, y); doc.text('Page 1 of 1', xValue, y); y += 5;
        doc.text('GLN:', xLabel, y); doc.text(gln, xValue, y); y += 5;
        doc.text('RUC:', xLabel, y); doc.text(this.clienteSeleccionado?.ruc || '---', xValue, y); y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('786' + producto.codpre || '---', 20, y);
        doc.text(producto.clienteNombres || 'EMPRESA DESCONOCIDA', 50, y);
        y += 10;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('GS1 Ecuador (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified By Ecuador.', 10, y);
        y += 5;
        doc.text('El dueño de la marca del producto coloca el código, es su resposabilidad el manejo y control del código, incluida su descripción y marca.', 10, y);
        y += 5;
        doc.text('El Prefijo Global de Compañía GS1, GCP, es intransferible.', 10, y); y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Detalle Unidad Comercial', 10, y); y += 5;
        doc.setLineWidth(0.3); doc.line(10, y, 200, y); y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('GTIN® UV:', 10, y); doc.text(producto.codbar || '---', 45, y); y += 5;
        doc.text('Tipo Código:', 10, y); doc.text(producto.gtin || 'GTIN 13', 45, y); y += 5;
        doc.text('Descripción del Producto:', 10, y); doc.text(producto.Despro || '---', 45, y); y += 5;
        doc.text('Marca:', 10, y); doc.text(producto.marca || '---', 45, y); y += 5;
        doc.text('Contenido:', 10, y); doc.text(producto.contenido?.toString() || '---', 45, y); y += 5;
        doc.text('Unidad de Medida:', 10, y); doc.text(producto.unidad || '---', 45, y); y += 5;
        doc.text('Categoría:', 10, y); doc.text(producto.dbrick, 45, y); y += 5;
        doc.text('Brick:', 10, y); doc.text(producto.brick, 45, y); y += 5;
        doc.text('País:', 10, y); doc.text(producto.pais, 45, y); y += 5;
        doc.text('Fecha Creación:', 10, y); doc.text(this.formatearFecha(producto.Feccre), 45, y); y += 10;

        // Tabla GTIN-14 UL
        if (this.registrosGtin14?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Detalle Unidad Logística', 10, y); y += 5;
          doc.line(10, y, 200, y); y += 6;
          doc.setFont('helvetica', 'bold');
          doc.text('GTIN-14', 10, y);
          doc.text('Descripción', 45, y);
          doc.text('Presentación', 110, y);
          doc.text('Factor', 150, y);
          y += 5;
          doc.setLineWidth(0.1);
          doc.line(10, y, 200, y); y += 4;

          doc.setFont('helvetica', 'normal');
          for (const reg of this.registrosGtin14) {
            doc.text(reg.g14, 10, y);
            doc.text(reg.descripcion || '---', 45, y);
            doc.text(reg.presentacion?.toString() || '-', 110, y);
            doc.text(reg.factor?.toString() || '-', 150, y);
            y += 5;
            if (y > 270) { doc.addPage(); y = 10; }
          }
          y += 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Detalle Empresa', 10, y); y += 5;
        doc.line(10, y, 200, y); y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('GLN:', 10, y); doc.text(gln, 40, y); y += 5;
        doc.text('RUC:', 10, y); doc.text(this.clienteSeleccionado?.ruc || '---', 40, y); y += 5;
        doc.text('Empresa:', 10, y); doc.text(producto.clienteNombres || '---', 40, y); y += 5;
        doc.text('Web:', 10, y); doc.text(web, 40, y);

        const pageHeight = doc.internal.pageSize.getHeight();
        let firmaY = y + 20;
        const maxFirmaY = pageHeight - firmaHeight - 10;
        if (firmaY > maxFirmaY) {
          firmaY = maxFirmaY;
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const firmaX = (pageWidth - firmaWidth) / 2;
        doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);

        const now = new Date();
        const fechaHora = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const nombreArchivo = `${producto.codbar}_${fechaHora}.pdf`;

        doc.save(nombreArchivo);
        this.formReporte.get('codigo')?.reset();
      },
      error: () => {
        this._snackBar.open('❌ Error al obtener el producto.', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-error']
        });
      }
    });
  }


  private async cargarImagenBase64(ruta: string): Promise<string> {
    const response = await fetch(ruta);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }



  imprimir(): void {
    const tipoReporte = this.formReporte.get('reporte')?.value;
    
    if (tipoReporte) {
      switch (tipoReporte) {
        case 'logistica':
          this.generarPdfLogistica();
          break;
        case 'gtinVenta':
          this.generarPdfGtinVenta();
          break;
        case 'general':
          this.generarPdfGeneral();
          break;
        case 'completo':
          this.generarPdfCompleto();
          break;
        case 'producto':
          this.generarPdfPorProducto();
          break;
        case 'membresia':
          this.generarPdfMembresia();
          break;
        case 'carta':
          this.generarPdfCarta();
          break;
        default:
          this.mostrarAlerta('Reporte no válido.', 'Advertencia');
          break;
      }
    } else {
      this.mostrarAlerta('Debe seleccionar un reporte para imprimir.', 'Advertencia');
    }
  }
  /**
 * Genera reporte PDF de Unidad Logística
 */
async generarPdfLogistica(): Promise<void> {
  try {
    // Mostrar loading
    this._snackBar.open('🔄 Generando reporte PDF GS1...', '', { duration: 2000 });

    // Preparar parámetros del reporte basados en el formulario
    const params = this.prepararParametrosReporte();
    
    // Obtener todos los productos para la exportación
    this.reporteService.getAllProductos(params).subscribe({
      next: async (productos) => {
        // Aplanar datos para el formato de tabla
        const datosParaExport = this.aplanarDatosParaExport(productos);
        
        // Preparar información del header
        const headerInfo = await this.prepararHeaderInfo();
        
        // Configurar opciones de exportación GS1
        const gs1Options = {
          data: datosParaExport,
          filename: 'reporte_unidad_logistica_gs1',
          headerInfo: headerInfo
        };


        // Llamar al nuevo servicio GS1
        await this.gs1ExportService.exportarPDFGS1(gs1Options);
        
        this._snackBar.open('✅ PDF GS1 generado correctamente', 'Cerrar', { 
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top' 
        });
      },
      error: (error) => {
        console.error('Error al obtener datos:', error);
        this._snackBar.open('❌ Error al generar el reporte', 'Cerrar', { 
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top' 
        });
      }
    });
  } catch (error) {
    console.error('Error en generarPdfLogistica:', error);
    this._snackBar.open('❌ Error al generar el PDF', 'Cerrar', { duration: 3000 });
  }
}

/**
 * Genera reporte Excel de Unidad Logística
 */
async generarExcelLogistica(): Promise<void> {
  try {
    // Mostrar loading
    this._snackBar.open('🔄 Generando reporte Excel...', '', { duration: 2000 });

    // Preparar parámetros del reporte
    const params = this.prepararParametrosReporte();
    
    // Obtener todos los productos para la exportación
    this.reporteService.getAllProductos(params).subscribe({
      next: async (productos) => {
        // Aplanar datos para el formato de tabla del ExportService
        const datosParaExport = this.aplanarDatosParaExport(productos);
        
        // Preparar información del header (AHORA ES ASYNC)
        const headerInfo = await this.prepararHeaderInfo();
        
        // Configurar opciones de exportación
        const exportOptions = {
          data: datosParaExport,
          columns: ['gtin13', 'descripcionProducto', 'marca', 'contenidoNeto', 'unidadMedida', 'fecha', 'gtin14', 'descripcionCodigo14', 'presentacion', 'unidad'],
          headers: ['GTIN-13', 'DESCRIPCIÓN', 'MARCA', 'CONTENIDO NETO', 'UNIDAD MEDIDA', 'FECHA', 'GTIN-14', 'DESCRIPCIÓN', 'PRESENTACIÓN', 'UNIDAD'],
          filename: 'reporte_unidad_logistica',
          title: 'Reporte de Producto con Presentaciones',
          logoUrl: 'assets/images/GS1-logo.png',
          headerInfo: headerInfo
        };

        // Llamar al ExportService
        await this.exportService.exportarExcel(exportOptions);
        
        this._snackBar.open('✅ Excel generado correctamente', 'Cerrar', { 
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top' 
        });
      },
      error: (error) => {
        console.error('Error al obtener datos:', error);
        this._snackBar.open('❌ Error al generar el reporte', 'Cerrar', { 
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top' 
        });
      }
    });
  } catch (error) {
    console.error('Error en generarExcelLogistica:', error);
    this._snackBar.open('❌ Error al generar el Excel', 'Cerrar', { duration: 3000 });
  }
}
/**
 * Nuevo método para exportar a Excel (agregar botón en el template)
 */
exportarExcel(): void {
  const tipoReporte = this.formReporte.get('reporte')?.value;
  
  if (tipoReporte === 'logistica') {
    this.generarExcelLogistica();
  } else {
    this.mostrarAlerta('Exportación a Excel disponible solo para Unidad Logística.', 'Advertencia');
  }
}
/**
 * Prepara los parámetros para el reporte basados en el formulario
 */
private prepararParametrosReporte(): ReporteUnidadLogisticaParams {
  const formValues = this.formReporte.value;
  const params: ReporteUnidadLogisticaParams = {};

  // Cliente
  if (this.clienteSeleccionado?.clientes_codigo) {
    params.clienteCodigo = this.clienteSeleccionado.clientes_codigo;
  }

  // Prefijo (si está seleccionado)
  if (formValues.gcp) {
    const prefijoSeleccionado = this.prefijos.find(p => p.id_prefijos === formValues.gcp);
    if (prefijoSeleccionado) {
      params.prefijo = prefijoSeleccionado.codpre;
    }
  }

  // Código de producto (si existe el campo 'codigo' en tu formulario)
  if (formValues.codigo) {
    params.codigoProducto = formValues.codigo;
  }

  // Estado
  if (formValues.estado !== null && formValues.estado !== undefined) {
    params.estado = formValues.estado === '1' || formValues.estado === 1;
  }

  // Fechas según el operador seleccionado
  const operadorFecha = formValues.operadorFecha;
  
  if (operadorFecha === 'entre') {
    if (formValues.desde) {
      params.fechaDesde = this.formatearFechaParaApi(formValues.desde);
      params.condicionFecha = 'ENTRE';
    }
    if (formValues.hasta) {
      params.fechaHasta = this.formatearFechaParaApi(formValues.hasta);
    }
  } else if (formValues.fecha) {
    params.fechaDesde = this.formatearFechaParaApi(formValues.fecha);
    
    switch (operadorFecha) {
      case 'igual':
        params.condicionFecha = 'IGUAL';
        break;
      case 'menorIgual':
        params.condicionFecha = 'MENOR_IGUAL';
        break;
      case 'mayor':
        params.condicionFecha = 'MAYOR';
        break;
    }
  }

  return params;
}
  generarPdfMembresia(): void { /* ... */ }
  generarPdfCarta(): void { /* ... */ }
  generarPdfGtinVenta(): void { /* ... */ }
  generarPdfGeneral(): void { /* ... */ }
  generarPdfCompleto(): void { /* ... */ }

  /**
 * Aplana los datos del JSON para el formato de tabla requerido por ExportService
 */
private aplanarDatosParaExport(productos: any[]): any[] {
  const datosAplanados: any[] = [];

  productos.forEach(producto => {
    if (producto.codigos_14 && producto.codigos_14.length > 0) {
      datosAplanados.push({
        ...producto,
        codigos_14: producto.codigos_14
      });
    } else {
      datosAplanados.push({
        ...producto,
        codigos_14: []
      });
    }
  });

  return datosAplanados;
}



/**
 * Prepara la información del header para el reporte
 * Usa el endpoint por codpre para obtener prefijogs1
 */
private async prepararHeaderInfo(): Promise<any> {
  const baseInfo = {
    emisor: 'GS1 Ecuador',
    fechaEmision: new Date().toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    pagina: '1',
    codigoEmpresa: '', // 👈 Ahora se llenará con prefijogs1
    nombreEmpresa: this.clienteSeleccionado?.nomcli || '',
    ruc: String(this.clienteE?.ruc || ''),
    gln: '',
    prefijo: ''
  };

  const prefijoId = this.formReporte.value.gcp;
  if (prefijoId) {
    try {
      // Obtener el codpre del prefijo seleccionado
      const prefijoSeleccionado = this.prefijos.find(p => p.id_prefijos === prefijoId);
      if (prefijoSeleccionado?.codpre) {
        
        // Usar el endpoint por codpre para obtener prefijogs1
        const prefijos = await this.prefijoService.buscarPorCodpre(prefijoSeleccionado.codpre).toPromise();
        if (prefijos && prefijos.length > 0) {
          const prefijoData = prefijos[0];
          baseInfo.gln = prefijoData.gln || '';
          baseInfo.prefijo = prefijoData.codpre || prefijoData.codpre;
          baseInfo.codigoEmpresa = prefijoData.prefijosgs1 || String(this.clienteSeleccionado?.clientes_codigo || ''); // 👈 prefijogs1 en codigoEmpresa
        }
        
        // También obtener GLN por id si es necesario
        const glns = await this.glnService.obtenerGlnPorIdPrefijo(prefijoId).toPromise();
        if (glns && glns.length > 0 && !baseInfo.gln) {
          baseInfo.gln = String(glns[0].gln1 || '');
        }
      }
    } catch (error) {
      console.warn('Error al obtener información del prefijo:', error);
      baseInfo.prefijo = this.obtenerPrefijoSeleccionado();
      baseInfo.codigoEmpresa = String(this.clienteSeleccionado?.clientes_codigo || ''); // 👈 Fallback al código de cliente
    }
  } else {
    // Si no hay prefijo seleccionado, usar código de cliente como fallback
    baseInfo.codigoEmpresa = String(this.clienteSeleccionado?.clientes_codigo || '');
  }

  return baseInfo;
}
/**
 * Obtiene el prefijo seleccionado en el formulario
 */
private obtenerPrefijoSeleccionado(): string {
  const prefijoId = this.formReporte.value.gcp;
  if (prefijoId) {
    const prefijo = this.prefijos.find(p => p.id_prefijos === prefijoId);
    return prefijo?.codpre || '';
  }
  return '';
}

/**
 * Formatea una fecha para el formato esperado por la API (YYYY-MM-DD)
 */
private formatearFechaParaApi(fecha: Date): string {
  if (!fecha) return '';
  
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
}
