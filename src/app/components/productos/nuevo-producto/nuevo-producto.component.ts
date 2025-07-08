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
    private clienteService: ClienteService
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

  generarPdfPorProducto(): void {
    const tipo = this.formReporte.get('certificado')?.value;
    if (tipo === 'producto') {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Certificado por Producto', 20, 20);

      // Aquí puedes agregar más detalles del producto:
      doc.setFontSize(12);
      doc.text('Empresa: GAPSystem', 20, 40);
      doc.text('Producto: Ejemplo 12345', 20, 50);
      // ...otros campos

      doc.save('certificado_producto.pdf');
    } else {
      this._snackBar.open('⚠️ Seleccione "Por Producto" para generar este PDF.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning']
      });
    }
  }

  imprimir(): void {
    const tipoReporte = this.formReporte.get('reporte')?.value;
    const tipoCertificado = this.formReporte.get('certificado')?.value;
    debugger
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
      this.mostrarAlerta('Debe seleccionar un reporte o certificado para imprimir.', 'Advertencia');
    }
  }

  generarPdfMembresia(): void { /* ... */ }
  generarPdfCarta(): void { /* ... */ }
  generarPdfGtinVenta(): void { /* ... */ }
  generarPdfLogistica(): void { /* ... */ }
  generarPdfGeneral(): void { /* ... */ }
  generarPdfCompleto(): void { /* ... */ }


}
