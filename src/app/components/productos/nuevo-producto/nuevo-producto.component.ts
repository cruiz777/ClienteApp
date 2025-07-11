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
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { ModuleRegistry } from '@ag-grid-community/core';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { CartaComponent } from './carta/carta.component';
import { ViewChild, ChangeDetectorRef } from '@angular/core';
import { CartaOficialComponent } from './carta-oficial/carta-oficial.component';
import { CiudadService } from 'src/app/services/ciudad.service';
import { format } from 'date-fns';
import * as ExcelJS from 'exceljs';

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
    getRowId: params => params.data.codbar,
    enableRangeSelection: true,
    defaultExcelExportParams: {
      sheetName: 'GTIN UV'
    }
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
  mostrarFiltrosCod: boolean = true;
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
    private cdRef: ChangeDetectorRef,
    private ciudadService: CiudadService

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


    this.cargarCliente();
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      if (cliente?.clientes_codigo) {
        this.cargarProductos(cliente.clientes_codigo);
      }
    });
    this.formReporte.get('reporte')?.valueChanges.subscribe(() => {
      this.actualizarVisibilidadFiltros();
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
    const valor = this.formReporte.get('reporte')?.value;
    return ['gtinVenta', 'logistica', 'membresia', 'carta', 'completo'].includes(valor);
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

      doc.setFontSize(10).setFont('helvetica', 'normal');
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
      doc.text('GS1 Ecuador (ECOP) certifica que los códigos GTIN...', 10, y); y += 5;
      doc.text('El dueño de la marca del producto coloca el código...', 10, y); y += 5;
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
        doc.text('Presentación', 110, y);
        doc.text('Factor', 150, y); y += 5;
        doc.setLineWidth(0.1).line(10, y, 200, y); y += 4;
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
      doc.text('RUC:', 10, y); doc.text(ruc, 40, y); y += 5;
      doc.text('Empresa:', 10, y); doc.text(producto.clienteNombres || '---', 40, y); y += 5;
      doc.text('Web:', 10, y); doc.text(web, 40, y);

      const firmaY = Math.min(y + 20, doc.internal.pageSize.getHeight() - firmaHeight - 10);
      const firmaX = (doc.internal.pageSize.getWidth() - firmaWidth) / 2;
      doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);

      const now = new Date();
      const fechaHora = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
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
    const tipoCertificado = this.formReporte.get('certificado')?.value;

    // Prioriza certificados si hay uno seleccionado
    if (tipoReporte) {
      switch (tipoReporte) {
        case 'gtinVenta':
          this.generarPdfGtinVenta();
          break;
        case 'logistica':
          this.generarPdfLogistica();
          break;
        case 'general':
          this.generarPdfGeneral();
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
      this.mostrarAlerta('Debe seleccionar un reporte o certificado para imprimir.', 'Advertencia');
    }
  }
  exportar(): void {
    const tipoReporte = this.formReporte.get('reporte')?.value;
    const tipoCertificado = this.formReporte.get('certificado')?.value;
    debugger
    // Prioriza certificados si hay uno seleccionado
    if (tipoReporte) {
      switch (tipoReporte) {
        case 'gtinVenta':

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
          this.cartaOficialComponent.gcp = prefijo.prefijosgs1;
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



  generarPdfGtinVenta(): void { /* ... */ }
  generarPdfLogistica(): void { /* ... */ }
  generarPdfGeneral(): void { /* ... */ }

generarPdfCompleto(): void {
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

  // Validación y extracción de fechas según el operador seleccionado
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

  } else if (operador === '<=') {
    condicionFecha = '<=';
    const fecha = this.formReporte.get('fecha')?.value;
    feccreDesde = fecha ? new Date(fecha).toISOString() : null;

  } else if (operador === '>=') {
    condicionFecha = '>=';
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


  exportarExcel(): void {
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
          GTIN_UV: fila.codbar, // Forzar formato texto en Excel
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


  obtenerFechaHoraActual(): string {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
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

    if (codpre) {
      try {
        const data = await firstValueFrom(this.prefijoService.buscarPorCodpre(codpre));
        if (data && data.length > 0) {
          const prefijo = data[0];
          this.cartaComponent.prefijo = codpre;
          this.cartaComponent.gcp = prefijo.prefijosgs1;
          this.cartaComponent.gln = prefijo.gln;

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

    // Asignar los @Input()
    this.cartaComponent.empresa = this.clienteSeleccionado?.nomcli || '';
    this.cartaComponent.ruc = this.clienteSeleccionado?.ruc || '';
    this.cartaComponent.anioAfiliacion = new Date(this.clienteSeleccionado?.fecing || '').getFullYear().toString();

    // Esperar a que Angular termine de renderizar si es necesario
    await new Promise(resolve => setTimeout(resolve, 0));

    // Llamar al método del componente
    await this.cartaComponent.generarPdfCarta();
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

  async exportarExcelCompleto(productos: any[]): Promise<void> {
    const fechaActual = new Date();
    const nombreArchivo = `ReporteCompleto-${this.clienteSeleccionado?.nomcli}-${format(fechaActual, 'yyyy-MM-dd-HH-mm')}.xlsx`;
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
      tl: { col: 2, row: 0 },
      ext: { width: 120, height: 60 }
    });

    // 👉 Encabezado institucional
    worksheet.mergeCells('B1:E1');
    worksheet.getCell('B1').value = 'SISTEMA DE CONTROL DE CÓDIGOS';
    worksheet.getCell('B1').font = { bold: true, size: 14 };

    worksheet.mergeCells('B2:E2');
    worksheet.getCell('B2').value = 'REPORTE DE PRODUCTOS CODIFICADOS';
    worksheet.getCell('B2').font = { bold: true, size: 12 };

    worksheet.getCell('B4').value = this.clienteSeleccionado?.nomcli || '';
    worksheet.getCell('B4').font = { bold: true };
    worksheet.getCell('C4').value = prefijo?.prefijosgs1 || '';

    worksheet.getCell('B6').value = 'RUC:';
    worksheet.getCell('C6').value = this.clienteSeleccionado?.ruc || '';

    worksheet.getCell('B7').value = 'GLN:';
    worksheet.getCell('C7').value = prefijo?.gln || '';

    worksheet.getCell('B8').value = 'Emisor:';
    worksheet.getCell('C8').value = 'GS1 Ecuador';

    worksheet.getCell('B9').value = 'Fecha emisión :';
    worksheet.getCell('C9').value = format(fechaActual, 'dd/MM/yyyy');

    // 👉 Cabeceras con columna #
    const headers = [
      '#', 'GTIN UV', 'DESCRIPCIÓN', 'MARCA',
      'CONTENIDO NETO', 'UNIDAD DE MEDIDA', 'CATEGORÍA',
      'DESCRIPCION EGORÍA', 'GCP BRICK', 'PAIS',
      'URL', 'SECTOR', 'OBSERVACION', 'FECHA', 'P.:'
    ];

    worksheet.addRow([]);
    worksheet.addRow(headers).font = { bold: true };

    // 👉 Filas de productos con numeración
    productos.forEach((p, i) => {
      worksheet.addRow([
        i + 1, // Número de línea
        p.codbar,
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

nuevo()
{
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
}
