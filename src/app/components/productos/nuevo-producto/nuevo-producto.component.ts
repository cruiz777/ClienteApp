//CODIGO para extraer implementar metodos faltantes del otro ts
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AgGridModule } from 'ag-grid-angular';
import { Router } from '@angular/router';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { ProductoService, Producto, PagedResult } from 'src/app/services/producto.service';
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
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { ReporteUnidadLogisticaService, } from 'src/app/services/reporte.service';
import { ExportService } from 'src/app/services/export.service';
import { ReporteUnidadLogisticaParams } from 'src/app/interfaces/responses/producto-reporte-response';
import { GlnService } from 'src/app/services/gln.service';
import { GS1ExportService } from 'src/app/services/gs1-export.service';

import { take } from 'rxjs/operators';
import { firstValueFrom, Observable } from 'rxjs';
import * as FileSaver from 'file-saver';
import { format } from 'date-fns';
import { CiudadService } from 'src/app/services/ciudad.service';
import { CartaComponent } from './carta/carta.component';
import { CartaOficialComponent } from './carta-oficial/carta-oficial.component';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from '../../utils/messages/custom-message-box.component';
import { ProductoRequests } from 'src/app/interfaces/requests/producto-filter-request';
import { CellKeyDownEvent } from 'ag-grid-community';
import { PermissionsService } from 'src/app/services/permission.service';


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
    MatRadioModule,
    CartaComponent,
    CartaOficialComponent
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
  @ViewChild(CartaComponent) cartaComponent!: CartaComponent;
  @ViewChild(CartaOficialComponent) cartaOficialComponent!: CartaOficialComponent;
  formReporte!: FormGroup; // ✅ declara la propiedad correctamente
  gridOptions: GridOptions = {
    getRowId: (params: any) => params.data.codbar,
    enableRangeSelection: true,
    defaultExcelExportParams: {
      sheetName: 'GTIN UV'
    },
    // 👇 Estas dos líneas son fundamentales
    pagination: true,
    rowModelType: 'clientSide',
  };

  activeTab: string = 'Listado';
  clienteSeleccionado: Cliente | null = null;
  filtroPrefijo: string = '';
  busqueda: string = '';
  //cantidadMostrar: number = 10;
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
  mostrarFiltrosCod: boolean = true;
  clienteE!: ClienteIndividual;
  pageNumber = 1;
  pageSize = 10;
  totalRegistros = 0;
  prefijo: string = '';
  busqueda1: string = '';
  public rowData: Producto[] = [];

  set cantidadMostrar(value: number) {
    this._cantidadMostrar = value;
    if (this.gridApi) {
      this.gridApi.setGridOption('paginationPageSize', Number(value));
    }
  }
  get cantidadMostrar(): number {
    return this._cantidadMostrar;
  }
  private _cantidadMostrar = 10;

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
    private gs1ExportService: GS1ExportService,
    private cdRef: ChangeDetectorRef,
    private ciudadService: CiudadService,
    private dialog: MatDialog,
    public permissions: PermissionsService
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
    this.formReporte.get('reporte')?.valueChanges.subscribe(() => {
      this.actualizarVisibilidadFiltros();
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
    this.router.navigateByUrl(`/productos/ul/${this.codigoSeleccionado}`);
  }


  cargarProductos(codigoCliente: number): void {
    const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: {
        title: 'Cargando Productos...',
        message: 'Por favor espere mientras se cargan los productos del cliente.',
        type: 'info',
        isLoading: true,
        loadingText: 'Cargando productos...',
        showCancel: false
      }
    });

    this.productoService
      .getProductosPorCliente(codigoCliente, this.pageNumber, this.pageSize, this.prefijo, this.busqueda1)
      .subscribe({
        next: (paged: PagedResult<Producto>) => {
          this.totalRegistros = paged.totalRecords;
          this.pageNumber = paged.pageNumber; // opcional
          this.pageSize = paged.pageSize;     // opcional

          this.registros = paged.records.map(p => ({
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

          loadingDialog.close();
        },
        error: err => {
          console.error('Error al cargar productos:', err);
          loadingDialog.close();
        }
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

  formatearFecha(fechaStr: string | Date): string {
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [anio, mes, dia] = fechaStr.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    const fecha = new Date(fechaStr);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  irAUvIndividual(): void {
    this.router.navigate(['/productos/uv-individual']);
  }

  irBloque(): void {
    this.router.navigate(['/productos/bloque']);
  }

  salir(): void {
    this.router.navigate(['/productos/cliente-seleccion']);
  }

  seleccionarRegistroU(registro: any) {
    console.log('➡️ Doble clic sobre:', registro); // ✅ Verificación
    if (registro?.codbar) {
      this.router.navigate(['/productos/uv-individual-edit', registro.codbar]);
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
    const valor = this.formReporte.get('reporte')?.value;
    return ['gtinVenta', 'logistica', 'membresia', 'carta', 'completo',  'general'].includes(valor);
  }


  async generarPdfPorProducto(): Promise<void> {
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

    const [logoBase64, firmaBase64] = await Promise.all([
      this.cargarImagenBase64('assets/logo/GS1-logo.png'),
      this.cargarImagenBase64('assets/logo/firma.png')
    ]);

    const logoWidth = 30, logoHeight = 20;
    const firmaWidth = 50, firmaHeight = 15;

    this.productoService.buscarPorCodbar(codbar).pipe(take(1)).subscribe({
      next: async (producto) => {
        if (!producto) {
          this._snackBar.open('⚠️ Producto no encontrado.', 'Cerrar', { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top', panelClass: ['snackbar-warning'] });
          return;
        }

        let gln = '---', web = '---';
        if (producto.codpre) {
          try {
            const prefijos = await firstValueFrom(this.prefijoService.buscarPorCodpre(producto.codpre));
            if (prefijos.length > 0) {
              gln = prefijos[0].gln || '---';
              web = prefijos[0].web || '---';
            }
          } catch (error) {
            console.error('❌ Error al obtener prefijos:', error);
          }
        }

        const doc = new jsPDF();
        let y = 10;
        const xLabel = 150, xValue = 180;

        doc.addImage(logoBase64, 'PNG', 15, 10, logoWidth, logoHeight);
        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text('Sistema de Control de Códigos', 105, y, { align: 'center' }); y += 8;
        doc.text('Reporte de Ficha Producto', 105, y, { align: 'center' }); y += 10;

        doc.setFontSize(9).setFont('helvetica', 'normal');
        const fecha = this.formatearFecha(new Date().toISOString());
        const ruc = this.clienteSeleccionado?.ruc || '---';
        doc.text('Emisor :', xLabel, y); doc.text('GS1', xValue, y); y += 5;
        doc.text('Fecha de Emisión:', xLabel, y); doc.text(fecha, xValue, y); y += 5;
        doc.text('Pag.:', xLabel, y); doc.text('Page 1 of 1', xValue, y); y += 5;
        doc.text('GLN:', xLabel, y); doc.text(gln, xValue, y); y += 5;
        doc.text('RUC:', xLabel, y); doc.text(ruc, xValue, y); y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('786' + (producto.codpre || '---'), 20, y);
        doc.text(producto.clienteNombres || 'EMPRESA DESCONOCIDA', 50, y); y += 10;

        doc.setFontSize(8).setFont('helvetica', 'normal');
        doc.text('GS1 Ecuador  (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified By Ecuador.', 10, y); y += 5;
        doc.text('El dueño de la marca del producto coloca el código, es su resposabilidad el manejo y control del código, incluida su descripción y marca.', 10, y); y += 5;
        doc.text('El Prefijo Global de Compañía GS1, GCP, es intransferible.', 10, y); y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Detalle Unidad Comercial', 10, y); y += 5;
        doc.setLineWidth(0.3).line(10, y, 200, y); y += 6;

        doc.setFont('helvetica', 'normal');
        const detalles = [
          ['GTIN® UV:', producto.codbar || '---'],
          ['Tipo Código:', producto.gtin || 'GTIN 13'],
          ['Descripción del Producto:', producto.Despro || '---'],
          ['Marca:', producto.marca || '---'],
          ['Contenido:', producto.contenido?.toString() || '---'],
          ['Unidad de Medida:', producto.unidad || '---'],
          ['Categoría:', producto.dbrick || '---'],
          ['Brick:', producto.brick || '---'],
          ['País:', producto.pais || '---'],
          ['Fecha Creación:', this.formatearFecha(producto.Feccre)]
        ];
        for (const [label, value] of detalles) {
          doc.text(label, 10, y); doc.text(value, 45, y); y += 5;
        }

        if (this.registrosGtin14?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Detalle Unidad Logística', 10, y); y += 5;
          doc.line(10, y, 200, y); y += 6;
          doc.text('GTIN-14', 10, y);
          doc.text('Descripción', 45, y);
          doc.text('Presentación', 170, y);
          doc.text('Factor', 190, y); y += 5;
          doc.setLineWidth(0.1).line(10, y, 200, y); y += 4;
          doc.setFont('helvetica', 'normal');
          for (const reg of this.registrosGtin14) {
            doc.text(reg.g14, 10, y);
            doc.text(reg.descripcion || '---', 45, y);
            doc.text(reg.presentacion?.toString() || '-', 180, y);
            doc.text(reg.factor?.toString() || '-', 190, y);
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
        doc.text('RUC:', 10, y); doc.text(ruc, 40, y); y += 5;
        doc.text('Empresa:', 10, y); doc.text(producto.clienteNombres || '---', 40, y); y += 5;
        doc.text('Web:', 10, y); doc.text(web, 40, y);

        const firmaY = Math.min(y + 20, doc.internal.pageSize.getHeight() - firmaHeight - 10);
        const firmaX = (doc.internal.pageSize.getWidth() - firmaWidth) / 2;
        doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);

        const now = new Date();
        const fechaHora = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const codigoProducto = producto.codbar || 'SinCodigo';
        const nombreArchivo = `${this.generarNombreArchivo('Producto')}_${codigoProducto}_${fechaHora}.pdf`;

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
      if (!this.formReporte.get('gcp')?.value) {
        this.mostrarAlerta('⚠️ Debe seleccionar un Prefijo', 'Advertencia');
        return;
      }
      
      // ✅ Abrir diálogo de loading
      const loadingDialog = this.abrirDialogoProgreso(
        'Generando Reporte PDF',
        'Obteniendo información del servidor...'
      );

      const params = this.prepararParametrosReporte();

      // PASO 1: Obtener metadata
      const response = await firstValueFrom(
        this.reporteService.getReporteUnidadLogistica(params)
      );

      if (response.type !== 'SUCCESS' || !response.data) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron datos', 'Cerrar', { duration: 3000 });
        return;
      }

      const { metadata } = response.data;

      // ✅ CORRECCIÓN: Usar productos.totalItems
      const totalRegistros = response.data.productos.totalItems || 0;

      // Calcular tiempo estimado
      const lotesTotales = Math.ceil(totalRegistros / 10000);
      const tiempoEstimadoSegundos = Math.ceil((lotesTotales * 989) / 1000);
      const tiempoEstimadoMostrar = this.formatearTiempoEstimado(tiempoEstimadoSegundos);

      // Actualizar diálogo
      loadingDialog.componentInstance.updateProgress(0, totalRegistros, tiempoEstimadoMostrar);

      // PASO 2: Obtener productos por lotes
      // ✅ CAMBIO: Usar obtenerProductosPorLotesDirecto con tipo 'logistica'
      const todosLosProductos = await this.obtenerProductosPorLotesDirecto(
        params,
        totalRegistros,
        loadingDialog,
        'logistica'
      );

      if (todosLosProductos.length === 0) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos', 'Cerrar', { duration: 3000 });
        return;
      }

      // Actualizar: Generando PDF
      loadingDialog.componentInstance.data.loadingText = '📄 Generando documento PDF...';
      loadingDialog.componentInstance.data.showProgress = false;

      // PASO 3: Generar PDF
      const datosParaExport = this.aplanarDatosParaExport(todosLosProductos);
      const headerInfo = this.prepararHeaderInfoDesdeBackend(metadata);

      await this.gs1ExportService.exportarPDFGS1({
        data: datosParaExport,
        filename: this.generarNombreArchivo('UnidadLogistica'),
        headerInfo: headerInfo
      });

      loadingDialog.close();
      this._snackBar.open('✅ PDF generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error:', error);
      this._snackBar.open('❌ Error al generar PDF', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Genera reporte Excel de Unidad Logística
   */
  /**
   * Genera reporte Excel GS1 con el mismo formato que el PDF
   */
  async generarExcelLogistica(): Promise<void> {
    try {

      if (!this.formReporte.get('gcp')?.value) {
        this.mostrarAlerta('⚠️ No Selecciono Prefijo', 'Advertencia');
        return;
      }
      const loadingDialog = this.abrirDialogoProgreso(
        '📊 Generando Reporte Excel',
        'Obteniendo información del servidor...'
      );

      const params = this.prepararParametrosReporte();

      // PASO 1: Obtener metadata
      const response = await firstValueFrom(
        this.reporteService.getReporteUnidadLogistica(params)
      );

      if (response.type !== 'SUCCESS' || !response.data) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron datos', 'Cerrar', { duration: 3000 });
        return;
      }

      const { metadata } = response.data;
      const totalRegistros = response.data.productos.totalItems || 0;

      // Calcular tiempo estimado
      const lotesTotales = Math.ceil(totalRegistros / 10000);
      const tiempoEstimadoSegundos = Math.ceil((lotesTotales * 989) / 1000);
      const tiempoEstimadoMostrar = this.formatearTiempoEstimado(tiempoEstimadoSegundos);

      loadingDialog.componentInstance.updateProgress(0, totalRegistros, tiempoEstimadoMostrar);

      // PASO 2: Obtener productos por lotes
      // ✅ USAR: obtenerProductosPorLotesDirecto con tipo 'logistica'
      const todosLosProductos = await this.obtenerProductosPorLotesDirecto(
        params,
        totalRegistros,
        loadingDialog,
        'logistica'
      );

      if (todosLosProductos.length === 0) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos', 'Cerrar', { duration: 3000 });
        return;
      }

      // Actualizar: Generando Excel
      loadingDialog.componentInstance.data.loadingText = '📄 Generando archivo Excel...';
      loadingDialog.componentInstance.data.showProgress = false;

      // PASO 3: Generar Excel
      const datosParaExport = this.aplanarDatosParaExport(todosLosProductos);
      const headerInfo = this.prepararHeaderInfoDesdeBackend(metadata);

      await this.gs1ExportService.exportarExcelGS1({
        data: datosParaExport,
        filename: this.generarNombreArchivo('UnidadLogistica'),
        headerInfo: headerInfo
      });

      loadingDialog.close();
      this._snackBar.open('✅ Excel generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error:', error);
      this._snackBar.open('❌ Error al generar Excel', 'Cerrar', { duration: 3000 });
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
  async generarPdfCarta(): Promise<void> {
    this.cdRef.detectChanges();

    const idSeleccionado = this.formReporte.value.gcp;
    if (!idSeleccionado) {
      this.mostrarAlerta('⚠️ Debe seleccionar un Prefijo primero.', 'Advertencia');
      return;
    }

    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const codpre = objeto?.codpre || '';

    if (!this.clienteSeleccionado?.clientes_codigo) {
      this.mostrarAlerta('⚠️ No hay cliente seleccionado.', 'Advertencia');
      return;
    }

    try {
      // Obtener cliente
      const cliente = await firstValueFrom(this.clienteService.getClienteById(this.clienteSeleccionado.clientes_codigo));

      // Asignar datos del cliente
      this.cartaOficialComponent.representante = cliente.representante || '';
      this.cartaOficialComponent.direccion = cliente.dircli || '';
      this.cartaOficialComponent.empresa = this.clienteSeleccionado.nomcli || '';

      // Obtener ciudad
      const ciudad = await firstValueFrom(this.ciudadService.getCiudadById(cliente.idCiudad));
      this.cartaOficialComponent.ciudad = ciudad.ciudad;

      // Obtener prefijo
      if (codpre) {
        const data = await firstValueFrom(this.prefijoService.buscarPorCodpre(codpre));
        if (data && data.length > 0) {
          const prefijo = data[0];
          this.cartaOficialComponent.prefijo = codpre;
          this.cartaOficialComponent.gcp = prefijo.prefijosgs1 || '';
          this.cartaOficialComponent.gln = prefijo.gln;
        } else {
          this.mostrarAlerta('⚠️ No se encontró información para el código de prefijo.', 'Advertencia');
          return;
        }
      }

      // ✅ Finalmente generar el PDF
      await this.cartaOficialComponent.generarCartaPDF();

    } catch (error) {
      console.error('❌ Error en la generación de carta:', error);
      this.mostrarAlerta('❌ Ocurrió un error al generar la carta.', 'Error');
    }
  }
  async generarPdfGtinVenta(): Promise<void> {
    if (!this.clienteSeleccionado?.clientes_codigo) {
      this.mostrarAlerta('⚠️ No hay cliente seleccionado.', 'Advertencia');
      return;
    }
    if (!this.formReporte.get('gcp')?.value) {
      this.mostrarAlerta('⚠️ No  seleccionado Prefijo', 'Advertencia');
      return;
    }

    try {
      // ✅ Abrir diálogo de loading simple (no sabemos el total hasta que llegue)
      const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
        disableClose: true,
        width: '450px',
        data: {
          title: '🔄 Generando Reporte PDF GTIN Venta',
          message: 'Obteniendo productos del servidor...',
          type: 'info',
          isLoading: true,
          showProgress: false, // Sin barra porque no sabemos el total
          loadingText: 'Consultando base de datos...',
          showCancel: false
        }
      });

      const codpro = this.formReporte.get('codigo')?.value;
      const idPrefijos = this.formReporte.get('gcp')?.value;
      const operador = this.formReporte.get('operadorFecha')?.value;

      const estadoSeleccionado = this.formReporte.get('estado')?.value;
      let activo: boolean | undefined;
      if (estadoSeleccionado === true || estadoSeleccionado === '1') {
        activo = true;
      } else if (estadoSeleccionado === false || estadoSeleccionado === '0') {
        activo = false;
      }

      let fechaDesde: Date | undefined;
      let fechaHasta: Date | undefined;

      if (operador === 'igual') {
        const fecha = this.formReporte.get('fecha')?.value;
        fechaDesde = fechaHasta = fecha;
      } else if (operador === 'mayor') {
        fechaDesde = this.formReporte.get('fecha')?.value;
      } else if (operador === 'menorIgual') {
        fechaHasta = this.formReporte.get('fecha')?.value;
      } else if (operador === 'entre') {
        fechaDesde = this.formReporte.get('desde')?.value;
        fechaHasta = this.formReporte.get('hasta')?.value;
      }

      const request: ProductoRequests = {
        codpro,
        idPrefijos,
        fechaDesde,
        fechaHasta,
        activo
      };

      console.log('Enviando request:', JSON.stringify(request));

      // ✅ Actualizar mensaje mientras consulta
      loadingDialog.componentInstance.data.loadingText = 'Procesando productos...';

      // Obtener respuesta del backend
      const respuesta = await firstValueFrom(
        this.productoService.getProductosFiltrados(request)
      );

      if (!respuesta.productos || respuesta.productos.length === 0) {
        loadingDialog.close();
        this.mostrarAlerta('⚠️ No se encontraron productos para exportar', 'Advertencia');
        return;
      }

      // ✅ Actualizar: Generando PDF
      loadingDialog.componentInstance.data.loadingText = `📄 Generando PDF con ${respuesta.productos.length.toLocaleString()} productos...`;

      // Dar tiempo al navegador para actualizar UI
      await this.delay(50);

      // Preparar datos y generar PDF
      const headerInfo = {
        codigoEmpresa: respuesta.cliente?.gs1 || '---',
        nombreEmpresa: respuesta.cliente?.nombreCliente || '---',
        ruc: respuesta.cliente?.ruc || '---',
        gln: respuesta.cliente?.gln || '---',
        fechaEmision: new Date().toLocaleDateString('es-EC')
      };

      const exportOptions = {
        data: respuesta.productos, // Usar directamente ProductoResponse[]
        filename: this.generarNombreArchivo('GTIN_UV'),
        headerInfo: headerInfo
      };

      await this.gs1ExportService.exportarPDFGtinVenta(exportOptions);

      // ✅ Cerrar loading y mostrar éxito
      loadingDialog.close();
      this._snackBar.open('✅ PDF GTIN Venta generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error al generar PDF GTIN Venta:', error);
      this.mostrarAlerta('❌ Error al generar el PDF', 'Error');
    }
  }

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
  private prepararHeaderInfoDesdeBackend(metadata: any): any {
    return {
      emisor: metadata.emisor || 'GS1 Ecuador',
      fechaEmision: metadata.fecha_emision || new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      pagina: metadata.pagina?.toString() || '1',
      codigoEmpresa: metadata.prefijo_gs1 || metadata.cliente_codigo?.toString() || '', // Usar prefijo_gs1 principal y clientecodigo como fallback
      nombreEmpresa: metadata.empresa_nombre || '',
      ruc: metadata.ruc || '',
      gln: metadata.gln || '', //GLN ya viene del backend
      prefijo: metadata.prefijo || ''
    };

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
  private formatearFechaParaApi(fecha: any): string {
    if (!fecha) return '';

    // ✅ Crear objeto Date sin importar el tipo de entrada
    let fechaObj: Date;

    try {
      // Si ya es un Date, usarlo directamente
      if (fecha instanceof Date) {
        fechaObj = fecha;
      }
      // Si es un objeto Moment.js (Material DatePicker con MomentDateAdapter)
      else if (fecha && typeof fecha === 'object' && fecha._isAMomentObject) {
        fechaObj = fecha.toDate(); // Convertir moment a Date
      }
      // Si es un objeto moment sin la propiedad _isAMomentObject
      else if (fecha && typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      }
      // Si es string, parsearlo
      else if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      }
      // Si es timestamp numérico
      else if (typeof fecha === 'number') {
        fechaObj = new Date(fecha);
      }
      // Fallback: intentar crear Date directamente
      else {
        fechaObj = new Date(fecha);
      }

      // ✅ Validar que el Date resultante sea válido
      if (isNaN(fechaObj.getTime())) {
        console.warn('Fecha inválida recibida:', fecha);
        return '';
      }

    } catch (error) {
      console.error('Error al procesar fecha:', fecha, error);
      return '';
    }

    // ✅ Formatear fecha válida
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Genera reporte PDF General usando getAllProductosPorCliente
   */
  async generarPdfGeneral(): Promise<void> {
    try {
      // ✅ Abrir diálogo de loading
      const loadingDialog = this.abrirDialogoProgreso(
        '🔄 Generando Reporte PDF General',
        'Obteniendo información del servidor...'
      );

      const params = this.prepararParametrosProductosPorCliente();

      // Validar parámetros
      const validationErrors = this.reporteService.validateProductosPorClienteParams(params);
      if (validationErrors.length > 0) {
        loadingDialog.close();
        this._snackBar.open(`⚠️ ${validationErrors[0]}`, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      // PASO 1: Obtener metadata del backend (primera página)
      const response = await firstValueFrom(
        this.reporteService.getProductosPorCliente(params)
      );

      if (response.type !== 'SUCCESS' || !response.data) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron datos para exportar', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      const { metadata } = response.data;

      // ✅ Obtener total de registros desde productos.totalItems
      const totalRegistros = response.data.productos.totalItems || 0;

      // Calcular tiempo estimado
      const lotesTotales = Math.ceil(totalRegistros / 10000);
      const tiempoEstimadoSegundos = Math.ceil((lotesTotales * 989) / 1000);
      const tiempoEstimadoMostrar = this.formatearTiempoEstimado(tiempoEstimadoSegundos);

      // Actualizar diálogo con información real
      loadingDialog.componentInstance.updateProgress(0, totalRegistros, tiempoEstimadoMostrar);

      // PASO 2: Obtener TODOS los productos por lotes con progreso
      // ✅ USAR: obtenerProductosPorLotesDirecto con tipo 'general'
      const todosLosProductos = await this.obtenerProductosPorLotesDirecto(
        params,
        totalRegistros,
        loadingDialog,
        'general'
      );

      if (todosLosProductos.length === 0) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos para exportar', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      // ✅ Actualizar: Generando PDF
      loadingDialog.componentInstance.data.loadingText = '📄 Generando documento PDF...';
      loadingDialog.componentInstance.data.showProgress = false;

      // PASO 3: Preparar datos y generar PDF
      const datosParaExport = this.aplanarDatosGeneralParaExport(todosLosProductos);
      const headerInfo = this.prepararHeaderInfoDesdeBackend(metadata);

      await this.gs1ExportService.exportarPDFGS1({
        data: datosParaExport,
        filename: this.generarNombreArchivo('General'),
        headerInfo: headerInfo
      });

      // ✅ Cerrar loading y mostrar éxito
      loadingDialog.close();
      this._snackBar.open('✅ PDF General generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error en generarPdfGeneral:', error);
      this._snackBar.open('❌ Error al generar el PDF', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Genera reporte Excel General usando GLN del backend y TODOS los registros
   */
  async generarExcelGeneral(): Promise<void> {
    try {
      // ✅ Abrir diálogo de loading
      const loadingDialog = this.abrirDialogoProgreso(
        '📊 Generando Reporte Excel General',
        'Obteniendo información del servidor...'
      );

      const params = this.prepararParametrosProductosPorCliente();

      // Validar parámetros
      const validationErrors = this.reporteService.validateProductosPorClienteParams(params);
      if (validationErrors.length > 0) {
        loadingDialog.close();
        this._snackBar.open(`⚠️ ${validationErrors[0]}`, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      // PASO 1: Obtener metadata del backend (primera página)
      const response = await firstValueFrom(
        this.reporteService.getProductosPorCliente(params)
      );

      if (response.type !== 'SUCCESS' || !response.data) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron datos para exportar', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      const { metadata } = response.data;

      // ✅ Obtener total de registros desde productos.totalItems
      const totalRegistros = response.data.productos.totalItems || 0;

      // Calcular tiempo estimado
      const lotesTotales = Math.ceil(totalRegistros / 10000);
      const tiempoEstimadoSegundos = Math.ceil((lotesTotales * 989) / 1000);
      const tiempoEstimadoMostrar = this.formatearTiempoEstimado(tiempoEstimadoSegundos);

      // Actualizar diálogo con información real
      loadingDialog.componentInstance.updateProgress(0, totalRegistros, tiempoEstimadoMostrar);

      // PASO 2: Obtener TODOS los productos por lotes con progreso
      // ✅ USAR: obtenerProductosPorLotesDirecto con tipo 'general'
      const todosLosProductos = await this.obtenerProductosPorLotesDirecto(
        params,
        totalRegistros,
        loadingDialog,
        'general'
      );

      if (todosLosProductos.length === 0) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos para exportar', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      // ✅ Actualizar: Generando Excel
      loadingDialog.componentInstance.data.loadingText = '📄 Generando archivo Excel...';
      loadingDialog.componentInstance.data.showProgress = false;

      // PASO 3: Preparar datos y generar Excel
      const datosParaExport = this.aplanarDatosGeneralParaExport(todosLosProductos);
      const headerInfo = this.prepararHeaderInfoDesdeBackend(metadata);

      await this.gs1ExportService.exportarExcelGS1({
        data: datosParaExport,
        filename: this.generarNombreArchivo('General'),
        headerInfo: headerInfo
      });

      // ✅ Cerrar loading y mostrar éxito
      loadingDialog.close();
      this._snackBar.open('✅ Excel General generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error en generarExcelGeneral:', error);
      this._snackBar.open('❌ Error al generar el Excel', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Prepara parámetros específicos para productos por cliente (NUEVO)
   */
    private prepararParametrosProductosPorCliente(): any {
    const formValues = this.formReporte.value;
    const params: any = {
      clienteCodigo: this.clienteSeleccionado?.clientes_codigo || 0
    };
    
    // Prefijo (si está seleccionado)
    const idPrefijo = formValues.gcp;
    if (idPrefijo) {
      const prefijoObj = this.prefijos.find(p => p.id_prefijos === idPrefijo);
      if (prefijoObj) {
        params.prefijo = prefijoObj.codpre;
      }
    }

    // Código de producto
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


  /**
   * Aplana datos para reporte general (NUEVO - diferente al de unidad logística)
   */
  private aplanarDatosGeneralParaExport(productos: any[]): any[] {
    return productos.map(producto => ({
      codigo_producto: producto.codigo_producto,
      descripcion: producto.descripcion,
      marca: producto.marca,
      contenido_neto: producto.contenido_neto,
      unidad_medida: producto.unidad_medida,
      fecha: producto.fecha,
      codigos_14: producto.codigos_14 || []
    }));
  }


  /**
   * Método principal para exportar a Excel - optimizado con switch
   */
  exportarExcel(): void {
    const tipoReporte = this.formReporte.get('reporte')?.value;

    if (tipoReporte) {
      switch (tipoReporte) {
        case 'logistica':
          debugger
          this.generarExcelLogistica();
          break;
        case 'general':
          this.generarExcelGeneral();
          break;
        case 'gtinVenta':
          this.generarExcelGtinVenta();
          break;

        case 'completo':
          // Ya tienes este método implementado
          this.generarPdfCompleto(); // Necesitarás ajustar los parámetros
          break;
        // Agregar más casos según necesites
        default:
          this.mostrarAlerta('Exportación a Excel no disponible para este tipo de reporte.', 'Advertencia');
          break;
      }
    } else {
      this.mostrarAlerta('Debe seleccionar un reporte para exportar a Excel.', 'Advertencia');
    }
  }

  exportarExcelGrid(): void {
    const fechaHora = this.obtenerFechaHoraActual();
    const datos: any[] = [];
    const totalRows = this.gridApi.getDisplayedRowCount();

    for (let i = 0; i < totalRows; i++) {
      const fila = this.gridApi.getDisplayedRowAtIndex(i)?.data;
      if (fila) {
        datos.push({
          Empresa: fila.empresa,
          Prefijo: fila.prefijo,
          Tipo_GTIN: fila.tipogtin,
          Estado: fila.estado,
          GTIN_UV: fila.codbar,
          Presentacion: fila.presentacion,
          Descripcion: fila.descripcion,
          Fecha: fila.fecha,
          Marca: fila.marca,
          Contenido: fila.contenido,
          Unidad: fila.unidad,
          Categoria: fila.categoria,
          Brick: fila.gcp_brick,
          Pais: fila.pais
        });
      }
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'GTINs': worksheet },
      SheetNames: ['GTINs']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, `gtins_export_${fechaHora}.xlsx`);
  }

  exportar(): void {
    const tipoReporte = this.formReporte.get('reporte')?.value;

    if (tipoReporte) {
      switch (tipoReporte) {
        case 'gtinVenta':
          // Llamar método cuando lo implementes
          break;
        case 'logistica':
          break;
        case 'general':
          break;
        case 'completo':
          this.generarPdfCompleto();
          break;
        default:
          this.mostrarAlerta('Reporte no válido.', 'Advertencia');
          break;
      }
    } else {
      this.mostrarAlerta('Debe seleccionar un reporte o certificado para imprimir.', 'Advertencia');
    }
  }

  async generarExcelGtinVenta(): Promise<void> {
    if (!this.clienteSeleccionado?.clientes_codigo) {
      this.mostrarAlerta('⚠️ No hay cliente seleccionado.', 'Advertencia');
      return;
    }
    if (!this.formReporte.get('gcp')?.value) {
      this.mostrarAlerta('⚠️ No Selecciono Prefijo', 'Advertencia');
      return;
    }
    try {
      // ✅ Abrir diálogo de loading simple
      const loadingDialog = this.dialog.open(CustomMessageBoxComponent, {
        disableClose: true,
        width: '450px',
        data: {
          title: '📊 Generando Reporte Excel GTIN Venta',
          message: 'Obteniendo productos del servidor...',
          type: 'info',
          isLoading: true,
          showProgress: false,
          loadingText: 'Consultando base de datos...',
          showCancel: false
        }
      });

      const codpro = this.formReporte.get('codigo')?.value;
      const idPrefijos = this.formReporte.get('gcp')?.value;
      const operador = this.formReporte.get('operadorFecha')?.value;

      const estadoSeleccionado = this.formReporte.get('estado')?.value;
      let activo: boolean | undefined;
      if (estadoSeleccionado === true || estadoSeleccionado === '1') {
        activo = true;
      } else if (estadoSeleccionado === false || estadoSeleccionado === '0') {
        activo = false;
      }

      let fechaDesde: Date | undefined;
      let fechaHasta: Date | undefined;

      if (operador === 'igual') {
        const fecha = this.formReporte.get('fecha')?.value;
        fechaDesde = fechaHasta = fecha;
      } else if (operador === 'mayor') {
        fechaDesde = this.formReporte.get('fecha')?.value;
      } else if (operador === 'menorIgual') {
        fechaHasta = this.formReporte.get('fecha')?.value;
      } else if (operador === 'entre') {
        fechaDesde = this.formReporte.get('desde')?.value;
        fechaHasta = this.formReporte.get('hasta')?.value;
      }

      const request: ProductoRequests = {
        codpro,
        idPrefijos,
        fechaDesde,
        fechaHasta,
        activo
      };

      console.log('Enviando request:', JSON.stringify(request));

      // ✅ Actualizar mensaje mientras consulta
      loadingDialog.componentInstance.data.loadingText = 'Procesando productos...';

      // Obtener respuesta del backend
      const respuesta = await firstValueFrom(
        this.productoService.getProductosFiltrados(request)
      );

      if (!respuesta.productos || respuesta.productos.length === 0) {
        loadingDialog.close();
        this.mostrarAlerta('⚠️ No se encontraron productos para exportar', 'Advertencia');
        return;
      }

      // ✅ Actualizar: Generando Excel
      loadingDialog.componentInstance.data.loadingText = `📄 Generando Excel con ${respuesta.productos.length.toLocaleString()} productos...`;

      // Dar tiempo al navegador para actualizar UI
      await this.delay(50);

      // Preparar datos y generar Excel
      const headerInfo = {
        codigoEmpresa: respuesta.cliente?.gs1 || '---',
        nombreEmpresa: respuesta.cliente?.nombreCliente || '---',
        ruc: respuesta.cliente?.ruc || '---',
        gln: respuesta.cliente?.gln || '---',
        fechaEmision: new Date().toLocaleDateString('es-EC', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })

      };

      const exportOptions = {
        data: respuesta.productos, // Usar directamente ProductoResponse[]
        filename: this.generarNombreArchivo('GTIN_UV'),
        headerInfo: headerInfo
      };

      await this.gs1ExportService.exportarExcelGtinVenta(exportOptions);

      // ✅ Cerrar loading y mostrar éxito
      loadingDialog.close();
      this._snackBar.open('✅ Excel GTIN Venta generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error al generar Excel GTIN Venta:', error);
      this.mostrarAlerta('❌ Error al generar el Excel', 'Error');
    }
  }

  nuevo() {
    const hoy = new Date();
    this.formReporte.reset({
      reporte: 'gtinVenta',        // Marcar GTIN Unidad de Venta
      operadorFecha: 'igual',       // Operador "="
      fecha: hoy,                   // Fecha actual
      desde: null,
      hasta: null,
      gcp: null,
      codigo: '',
      estado: '1'                   // Activo
    });
  }
  async exportarExcelCompleto(productos: any[]): Promise<void> {
    const fechaActual = new Date();
    const nombreArchivo = `${this.generarNombreArchivo('Completo')}_${format(fechaActual, 'yyyyMMdd_HHmm')}.xlsx`;
    this.cdRef.detectChanges();

    const idSeleccionado = this.formReporte.value.gcp;
    if (!idSeleccionado) {
      this.mostrarAlerta('⚠️ Debe seleccionar un Prefijo primero.', 'Advertencia');
      return;
    }

    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const codpre = objeto?.codpre || '';
    let prefijo: any = null;

    if (codpre) {
      try {
        const data = await firstValueFrom(this.prefijoService.buscarPorCodpre(codpre));
        if (data && data.length > 0) {
          prefijo = data[0];
        } else {
          this.mostrarAlerta('⚠️ No se encontró información para el código de prefijo.', 'Advertencia');
          return;
        }
      } catch (error) {
        console.error('Error al buscar prefijo:', error);
        this.mostrarAlerta('❌ Error al buscar el prefijo.', 'Error');
        return;
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    const sectorMap: { [key: string]: string } = {
      '1': 'Salud',
      '2': 'Retail',
      '3': 'Otro',
      '4': 'Alimentos'
    };

    // 👉 Logo GS1
    const logoBlob = await fetch('assets/logo/GS1-logo.png').then(res => res.blob());
    const logoBuffer = await logoBlob.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: logoBuffer,
      extension: 'png'
    });

    worksheet.addImage(imageId, {
      tl: { col: 6, row: 0 },
      ext: { width: 120, height: 60 }
    });

    // 👉 Encabezado institucional
    worksheet.mergeCells('B1:D1');
    worksheet.getCell('B1').value = 'SISTEMA DE CONTROL DE CÓDIGOS';
    worksheet.getCell('B1').font = { bold: true, size: 16, color: { argb: 'FF003366' } };
    worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('B2:D2');
    worksheet.getCell('B2').value = 'REPORTE DE PRODUCTOS CODIFICADOS';
    worksheet.getCell('B2').font = { bold: true, size: 16, color: { argb: 'FF003366' } };
    worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('B4').value = this.clienteSeleccionado?.nomcli || '';
    worksheet.getCell('B4').font = { bold: true, size: 14, color: { argb: 'FFFF6600' } };
    worksheet.getCell('C4').value = prefijo?.prefijosgs1 || '';
    worksheet.getCell('C4').font = { bold: true, size: 14, color: { argb: 'FF003366' } };
    worksheet.getCell('B6').value = 'RUC:';
    worksheet.getCell('C6').value = this.clienteSeleccionado?.ruc || '';

    worksheet.getCell('B7').value = 'GLN:';
    worksheet.getCell('C7').value = prefijo?.gln || '';

    worksheet.getCell('B8').value = 'Emisor:';
    worksheet.getCell('C8').value = 'GS1 Ecuador';

    worksheet.getCell('B9').value = 'Fecha emisión :';
    worksheet.getCell('C9').value = format(fechaActual, 'dd/MM/yyyy');

    // 🟨 Advertencia antes de cabeceras
    worksheet.mergeCells('B11:O13');

    const cell = worksheet.getCell('B11');
    cell.value = {
      richText: [
        {
          text: 'GS1 Ecuador (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador.\n',
          font: { bold: false, color: { argb: 'FF000000' } }  // negro normal
        },
        {
          text: 'El dueño de la marca del producto pone el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca.\n',
          font: { bold: false, color: { argb: 'FF000000' } }  // negro normal
        },
        {
          text: 'El Prefijo Global De Compañía GS1, GCP, es ',
          font: { bold: true, color: { argb: 'FF000000' } }   // negro en negrita
        },
        {
          text: 'INTRANSFERIBLE.',
          font: { bold: true, color: { argb: 'FFFF0000' } }   // rojo en negrita
        }
      ]
    };

    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // fondo amarillo
    };



    // 👉 Cabeceras
    const headers = [
      '#', 'GTIN UV', 'DESCRIPCIÓN', 'MARCA',
      'CONTENIDO NETO', 'UNIDAD DE MEDIDA', 'CATEGORÍA',
      'DESCRIPCION EGORÍA', 'GCP BRICK', 'PAIS',
      'URL', 'SECTOR', 'OBSERVACION', 'FECHA', 'P.:'
    ];

    worksheet.addRow([]); // fila vacía si quieres separar visualmente
    worksheet.addRow(headers).font = { bold: true };

    // 👉 Filas de productos
    productos.forEach((p, i) => {
      const row = worksheet.addRow([
        i + 1,   // Columna 1
        p.codbar,        // Columna 2
        p.Despro,
        p.marca,
        p.contenido,
        p.unidad,
        p.codigoproducto,
        p.dbrick,
        p.brick,
        p.pais,
        p.url,
        sectorMap[p.sector] || 'No definido',
        p.Obs,
        p.Feccre ? format(new Date(p.Feccre), 'dd/MM/yyyy') : '',
        p.p
      ]);

      // 🔸 Columna 1: naranja
      row.getCell(1).font = {
        color: { argb: 'FFFF6600' } // naranja
      };

      // 🔹 Columna 2: azul y negrita
      row.getCell(2).font = {
        bold: true,
        size:12,
        color: { argb: 'FF0000FF' } // azul corporativo (o usa 'FF0000FF' para azul puro)
      };
    });

    // 👉 Autoajustar columnas
    worksheet.columns.forEach(column => {
      if (!column) return;
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const length = cell.value ? cell.value.toString().length : 0;
        maxLength = Math.max(maxLength, length);
      });
      column.width = maxLength + 2;
    });

    // 👉 Exportar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    FileSaver.saveAs(blob, nombreArchivo);
  }


  async generarPdfMembresia(): Promise<void> {
    this.cdRef.detectChanges();

    const idSeleccionado = this.formReporte.value.gcp;
    if (!idSeleccionado) {
      this.mostrarAlerta('⚠️ Debe seleccionar un Prefijo primero.', 'Advertencia');
      return;
    }

    const objeto = this.prefijos.find(p => p.id_prefijos === idSeleccionado);
    const codpre = objeto?.codpre || '';

    if (!codpre) {
      this.mostrarAlerta('⚠️ No se encontró el código de prefijo.', 'Advertencia');
      return;
    }

    try {
      // PASO 1: Generar la carta de membresía tradicional
      const data = await firstValueFrom(this.prefijoService.buscarPorCodpre(codpre));
      if (data && data.length > 0) {
        const prefijo = data[0];
        this.cartaComponent.prefijo = codpre;
        this.cartaComponent.gcp = prefijo.prefijosgs1 || '';
        this.cartaComponent.gln = prefijo.gln;
        this.cartaComponent.empresa = this.clienteSeleccionado?.nomcli || '';
        this.cartaComponent.ruc = this.clienteSeleccionado?.ruc || '';
        this.cartaComponent.anioAfiliacion = new Date(this.clienteSeleccionado?.fecing || '').getFullYear().toString();

        // Esperar renderizado y generar carta tradicional
        await new Promise(resolve => setTimeout(resolve, 0));
        await this.cartaComponent.generarPdfCarta();

        // PASO 2: Generar el nuevo reporte GS1 usando el endpoint de productos por prefijo
        this._snackBar.open('🔄 Generando reporte complementario GS1...', '', { duration: 2000 });

        this.generarPdfProductosPorPrefijo(codpre);

      } else {
        this.mostrarAlerta('⚠️ No se encontró información para el código de prefijo.', 'Advertencia');
        return;
      }
    } catch (error) {
      console.error('Error al buscar prefijo:', error);
      this.mostrarAlerta('❌ Error al buscar el prefijo.', 'Error');
      return;
    }
  }

  private async generarPdfProductosPorPrefijo(prefijo: string): Promise<void> {
    try {
      // ✅ Abrir diálogo de loading
      const loadingDialog = this.abrirDialogoProgreso(
        'Generando Reporte Complementario',
        'Obteniendo productos del prefijo...'
      );

      // Preparar parámetros para el endpoint por prefijo
      // const params = {
      //   prefijo: prefijo,
      //   clienteCodigo: this.clienteSeleccionado?.clientes_codigo,
      //   pageNumber: 1,
      //   pageSize: 50
      // };
      const params = this.prepararParametrosProductosPorPrefijo(prefijo);

      // PASO 1: Obtener metadata del backend (primera página)
      const response = await firstValueFrom(
        this.reporteService.getProductosPorPrefijo(params)
      );

      if (response.type !== 'SUCCESS' || !response.data) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos para el prefijo', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      const { metadata } = response.data;

      // ✅ Obtener total de registros
      const totalRegistros = response.data.productos.totalItems || 0;

      // Calcular tiempo estimado
      const lotesTotales = Math.ceil(totalRegistros / 10000);
      const tiempoEstimadoSegundos = Math.ceil((lotesTotales * 989) / 1000);
      const tiempoEstimadoMostrar = this.formatearTiempoEstimado(tiempoEstimadoSegundos);

      // Actualizar diálogo con información real
      loadingDialog.componentInstance.updateProgress(0, totalRegistros, tiempoEstimadoMostrar);

      // PASO 2: Obtener TODOS los productos del prefijo por lotes
      // ✅ USAR: obtenerProductosPorLotesDirecto con tipo 'prefijo'
      const todosLosProductos = await this.obtenerProductosPorLotesDirecto(
        params,
        totalRegistros,
        loadingDialog,
        'prefijo'
      );

      if (todosLosProductos.length === 0) {
        loadingDialog.close();
        this._snackBar.open('⚠️ No se encontraron productos para exportar', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        return;
      }

      // Actualizar: Generando PDF
      loadingDialog.componentInstance.data.loadingText = '📄 Generando documento PDF...';
      loadingDialog.componentInstance.data.showProgress = false;

      // PASO 3: Preparar datos y generar PDF
      const datosParaExport = this.aplanarDatosMembresiaPorPrefijo(todosLosProductos);
      const headerInfo = this.prepararHeaderInfoMembresia(metadata);

      await this.gs1ExportService.exportarPDFGS1({
        data: datosParaExport,
        filename: this.generarNombreArchivo('Membresia'),
        headerInfo: headerInfo
      });

      loadingDialog.close();
      this._snackBar.open('✅ Reporte de membresía GS1 generado correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

    } catch (error) {
      console.error('Error en generarPdfProductosPorPrefijoOptimizado:', error);
      this._snackBar.open('❌ Error al generar el reporte complementario', 'Cerrar', {
        duration: 3000
      });
    }
  }
  /**
   * Prepara parámetros para productos por prefijo INCLUYENDO filtros de fecha
   */
  private prepararParametrosProductosPorPrefijo(prefijo: string): any {
    const formValues = this.formReporte.value;
    const params: any = {
      prefijo: prefijo,
      clienteCodigo: this.clienteSeleccionado?.clientes_codigo,
      pageNumber: 1,
      pageSize: 50
    };

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

    console.log('📅 FECHA FORMATEADA QUE SE ENVÍA:', params.fechaDesde); // ✅ NUEVO
    console.log('📅 CONDICIÓN:', params.condicionFecha); // ✅ NUEVO
    return params;
  }
  /**
   * Aplana los datos específicos para el reporte de membresía por prefijo
   */
  private aplanarDatosMembresiaPorPrefijo(productos: any[]): any[] {
    return productos.map(producto => ({
      codigo_producto: producto.codigo_producto,
      descripcion: producto.descripcion,
      marca: producto.marca,
      contenido_neto: producto.contenido_neto,
      unidad_medida: producto.unidad_medida,
      fecha: producto.fecha,
      codigos_14: producto.codigos_14 || [],
      cliente_codigo: producto.cliente_codigo,
      cliente_nombre: producto.cliente_nombre
    }));
  }

  /**
   * Prepara header específico para reporte de membresía por prefijo
   */
  private prepararHeaderInfoMembresia(metadata: any): any {
    return {
      emisor: metadata.emisor || 'GS1 Ecuador',
      fechaEmision: metadata.fecha_emision || new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      pagina: metadata.pagina?.toString() || '1',
      codigoEmpresa: metadata.prefijo_gs1 || metadata.prefijo || '',
      nombreEmpresa: `Productos del Prefijo ${metadata.prefijo}`,
      ruc: metadata.ruc || '',
      gln: metadata.gln || '',
      prefijo: metadata.prefijo || ''
    };
  }

  generarPdfCompleto(): void {
    if (!this.formReporte.get('gcp')?.value) {
      this.mostrarAlerta('⚠️ Debe seleccionar un Prefijo', 'Advertencia');
      return;
    }
    
    const codCliente = this.clienteSeleccionado?.clientes_codigo;
    const idPrefijo = this.formReporte.get('gcp')?.value;
    const estado = this.formReporte.get('estado')?.value === '1' ? 'Activo' : 'Inactivo';
    const operador = this.formReporte.get('operadorFecha')?.value;

    // Obtener el codpre desde el id del prefijo
    const objetoPrefijo = this.prefijos.find(p => p.id_prefijos === idPrefijo);
    const codpre = objetoPrefijo?.codpre;

    let condicionFecha = '=';
    let feccreDesde: string | null = null;
    let feccreHasta: string | null = null;

    // ✅ CORREGIR: Usar los valores exactos del HTML
    if (operador === 'igual') {
      condicionFecha = '=';
      const fecha = this.formReporte.get('fecha')?.value;
      feccreDesde = fecha ? new Date(fecha).toISOString() : null;
    } else if (operador === 'entre') {
      condicionFecha = 'entre';
      const desde = this.formReporte.get('desde')?.value;
      const hasta = this.formReporte.get('hasta')?.value;
      feccreDesde = desde ? new Date(desde).toISOString() : null;
      feccreHasta = hasta ? new Date(hasta).toISOString() : null;
    } else if (operador === 'menorIgual') {  // ✅ CAMBIO: era '<='
      condicionFecha = '<=';
      const fecha = this.formReporte.get('fecha')?.value;
      feccreDesde = fecha ? new Date(fecha).toISOString() : null;
    } else if (operador === 'mayor') {       // ✅ CAMBIO: era '>='
      condicionFecha = '>';  // ✅ CAMBIO: era '>='
      const fecha = this.formReporte.get('fecha')?.value;
      feccreDesde = fecha ? new Date(fecha).toISOString() : null;
    }

    // Validar datos obligatorios
    if (!codCliente || !codpre || !feccreDesde) {
      this.mostrarAlerta('⚠️ Faltan datos obligatorios para generar el PDF completo.', 'Advertencia');
      return;
    }

    // Obtener código si fue ingresado
    const codigo = this.formReporte.value.codigo?.trim();

    // Armar filtro
    const filtro: any = {
      clientesCodigo: codCliente,
      codpre,
      estado,
      feccreDesde,
      feccreHasta: feccreHasta ?? undefined,
      condicionFecha
    };

    if (codigo) {
      filtro.codbar = codigo;
    }

    // Consultar y exportar
    this.productoService.filtrarProductosPorCliente(filtro).subscribe({
      next: productos => {
        console.log('Productos filtrados para PDF completo:', productos);
        this.exportarExcelCompleto(productos);
      },
      error: err => {
        console.error('❌ Error al filtrar productos:', err);
        this.mostrarAlerta('❌ Error al obtener los productos.', 'Error');
      }
    });
  }

  actualizarVisibilidadFiltros(): void {
    const valor = this.formReporte.get('reporte')?.value;

    // "producto" y "carta" ocultan los filtros generales
    this.mostrarFiltros = !['producto', 'carta'].includes(valor);

    // Solo "carta" oculta el campo "Código"
    this.mostrarFiltrosCod = valor !== 'carta';

    if (!this.mostrarFiltrosCod) {
      this.formReporte.get('codigo')?.reset();
    }

    this.cdRef.detectChanges();
  }

  obtenerFechaHoraActual(): string {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  }

  /**
 * Determina si el botón Imprimir debe estar habilitado
 */
  get imprimirHabilitado(): boolean {
    const tipoReporte = this.formReporte.get('reporte')?.value;

    // Deshabilitar si no hay reporte seleccionado o si es "completo"
    return !!tipoReporte && tipoReporte !== 'completo';
  }

  /**
   * Determina si el botón Excel debe estar habilitado
   */
  get excelHabilitado(): boolean {
    const tipoReporte = this.formReporte.get('reporte')?.value;

    // Habilitar para todos los reportes que tengan valor
    return !!tipoReporte;
  }
  cambiarCantidad(valor: number) {
    this.cantidadMostrar = Number(valor);
    if (this.gridApi) {
      this.gridApi.setGridOption('paginationPageSize', Number(this.cantidadMostrar));
    }

  }
  onChangePageSize(): void {
    this.pageSize = this.cantidadMostrar;
    this.pageNumber = 1;

    const codigoCliente = this.clienteSeleccionado?.clientes_codigo;
    if (codigoCliente !== undefined && codigoCliente !== null) {
      this.cargarProductos(codigoCliente);
    } else {
      console.warn('Cliente no seleccionado. No se puede cargar productos.');
    }
  }
  buscarProductos(): void {
    this.pageNumber = 1; // reiniciar a la primera página
    if (this.clienteSeleccionado?.clientes_codigo) {
      this.cargarProductos(this.clienteSeleccionado.clientes_codigo);
    }
  }

  onSeleccionPrefijo(prefijoSeleccionado: string): void {
    this.prefijo = prefijoSeleccionado;
    this.pageNumber = 1; // reinicia la paginación si es necesario

    if (this.clienteSeleccionado?.clientes_codigo) {
      this.cargarProductos(this.clienteSeleccionado.clientes_codigo);
    }
  }

  onKeyDown(event: any): void {
    if (!event || !event.column || !event.event) return;

    const keyboardEvent = event.event as KeyboardEvent;
    if (keyboardEvent.key !== 'Delete') return;

    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    const rowToDelete = selectedRows[0];
    const codbar = rowToDelete.codbar;

    const dialogRef = this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data: {
        title: '¿Desea confirmar?',
        message: `¿Quiere eliminar este GTIN: ${codbar}?`,
        type: 'info',
        confirmText: 'Sí, confirmar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.productoService.eliminarProductoPorCodbar(codbar).subscribe({
          next: (resp) => {
            if (resp.type === 'OK') {
              this.buscarProductos(); // recarga los productos para mantener consistencia
            } else {
              this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: 'No se pudo eliminar',
                  message: resp.message,
                  type: 'warning'
                }
              });
            }
          },
          error: () => {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'Error',
                message: 'No se puede eliminar el producto, tiene presentaciones',
                type: 'error'
              }
            });
          }
        });
      }
    });
  }
  //HELPERS
  /**
   * Genera un nombre de archivo consistente para todos los reportes
   * El timestamp lo agrega automáticamente GS1ExportService
   */
  private generarNombreArchivo(tipoReporte: string): string {
    const nombreEmpresa = this.clienteSeleccionado?.nomcli || 'SinEmpresa';
    
    // Obtener prefijo seleccionado
    const idPrefijo = this.formReporte.get('gcp')?.value;
    let codigoPrefijo = '';
    
    if (idPrefijo) {
      const prefijoObj = this.prefijos.find(p => p.id_prefijos === idPrefijo);
      codigoPrefijo = prefijoObj?.codpre || '';
    }
    
    // Limpiar nombre de empresa (quitar caracteres especiales)
    const nombreLimpio = nombreEmpresa
      .replace(/[^a-zA-Z0-9\s]/g, '')  // Quitar caracteres especiales
      .replace(/\s+/g, '_')             // Espacios a guiones bajos
      .substring(0, 50);                // Limitar longitud
    
    // Formato: TipoReporte_NombreEmpresa_Prefijo
    // El servicio agregará automáticamente: _YYYYMMDD_HHmmss
    if (codigoPrefijo) {
      return `${tipoReporte}_${nombreLimpio}_${codigoPrefijo}`;
    } else {
      return `${tipoReporte}_${nombreLimpio}`;
    }
  }
  // Método para obtener productos por lotes con progreso
  private async obtenerProductosPorLotesDirecto(
    params: any,
    totalRegistros: number,
    loadingDialog: any,
    tipoReporte: 'logistica' | 'general' | 'prefijo' = 'logistica'
  ): Promise<any[]> {
    const PAGE_SIZE = 10000;
    const totalPaginas = Math.ceil(totalRegistros / PAGE_SIZE);
    const todosLosProductos: any[] = [];
    const startTime = Date.now();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      const registrosProcesados = (pagina - 1) * PAGE_SIZE;

      // Calcular tiempo restante
      const tiempoTranscurrido = (Date.now() - startTime) / 1000;
      const tiempoRestante = this.calcularTiempoEstimado(pagina, totalPaginas, tiempoTranscurrido);

      // Actualizar progreso visual
      loadingDialog.componentInstance.updateProgress(
        Math.min(registrosProcesados, totalRegistros),
        totalRegistros,
        tiempoRestante
      );

      // ✅ Llamada al servicio según tipo de reporte
      let productosPagina: any;

      switch (tipoReporte) {
        case 'logistica':
          productosPagina = await firstValueFrom(
            this.reporteService.getReporteUnidadLogistica({
              ...params,
              pageNumber: pagina,
              pageSize: PAGE_SIZE
            })
          );
          break;

        case 'general':
          productosPagina = await firstValueFrom(
            this.reporteService.getProductosPorCliente({
              ...params,
              pageNumber: pagina,
              pageSize: PAGE_SIZE
            })
          );
          break;

        case 'prefijo':
          productosPagina = await firstValueFrom(
            this.reporteService.getProductosPorPrefijo({
              ...params,
              pageNumber: pagina,
              pageSize: PAGE_SIZE
            })
          );
          break;
      }

      // Extraer items según estructura de respuesta
      if (productosPagina.type === 'SUCCESS' && productosPagina.data) {
        todosLosProductos.push(...productosPagina.data.productos.items);
      }

      // Dar tiempo al navegador para actualizar UI
      await this.delay(10);
    }

    return todosLosProductos;
  }

  // Helper para formatear tiempo
  private formatearTiempoEstimado(segundos: number): string {
    if (segundos < 60) {
      return `${segundos}s`;
    } else if (segundos < 3600) {
      const minutos = Math.floor(segundos / 60);
      const segs = segundos % 60;
      return segs > 0 ? `${minutos}m ${segs}s` : `${minutos}m`;
    } else {
      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      return `${horas}h ${minutos}m`;
    }
  }

  // Helper para dar tiempo al navegador
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /**
 * Abre un diálogo de loading con progreso
 */
  private abrirDialogoProgreso(
    titulo: string = '🔄 Generando Reporte',
    mensaje: string = 'Obteniendo información del servidor...'
  ): any {
    return this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      width: '450px',
      data: {
        title: titulo,
        message: mensaje,
        type: 'info',
        isLoading: true,
        showProgress: true,
        currentProgress: 0,
        totalProgress: 100,
        loadingText: 'Iniciando proceso...',
        showCancel: false
      }
    });
  }

  /**
   * Calcula y actualiza el tiempo estimado dinámicamente
   */
  private calcularTiempoEstimado(
    paginaActual: number,
    totalPaginas: number,
    tiempoTranscurrido: number
  ): string {
    if (paginaActual <= 1) return 'Calculando...';

    const tiempoPorPagina = tiempoTranscurrido / (paginaActual - 1);
    const paginasRestantes = totalPaginas - paginaActual;
    const tiempoRestante = Math.ceil(paginasRestantes * tiempoPorPagina);

    return this.formatearTiempoEstimado(tiempoRestante);
  }

}
