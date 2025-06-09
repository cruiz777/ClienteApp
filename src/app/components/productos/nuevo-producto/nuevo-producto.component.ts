import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import { AgGridModule } from 'ag-grid-angular';
import { Router } from '@angular/router';
import { ProductoService, Producto } from 'src/app/services/producto.service';
import { Codigos14Service } from 'src/app/services/codigos14.service';

@Component({
  selector: 'app-nuevo-producto',
  standalone: true,
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.css',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AgGridModule,
    MatAutocompleteModule,
    MatTableModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSelectModule
  ],

})
export class NuevoProductoComponent implements OnInit {
  // Tab activo
  activeTab: string = 'Generar';

  // Formulario de GTIN
  gtinForm: FormGroup;

  // Datos del cliente y filtros
  clienteSeleccionado: Cliente | null = null;
  filtroPrefijo: string = '';
  busqueda: string = '';
  cantidadMostrar: number = 10;

  // Registro seleccionado para mostrar GTIN-14
  registroSeleccionado: any = null;
  codigoSeleccionado: string = '';
  // Datos auxiliares
  prefijos: string[] = ['750', '754', '760'];
  empaques: string[] = ['Caja', 'Unidad', 'Paquete'];

  // Columnas para tablas
  columnasUV: string[] = [
    'id', 'empresa', 'prefijo', 'tipogtin', 'estado', 'codbar',
    'presentacion', 'descripcion', 'fecha', 'marca', 'contenido',
    'unidad', 'categoria', 'gcp_brick', 'pais'
  ];

  columnas: string[] = [
    'gtin', 'descripcion', 'categoria', 'marca', 'contenidoNeto',
    'contenidoUM', 'gcpBrick', 'pais', 'urlFoto'
  ];



  columnasGTIN14: string[] = [
    'id', 'g14', 'codbar', 'prefijo', 'presentacion', 'factor',
    'descripcion', 'fecha', 'estado'
  ];

  // Datos cargados
  registros: any[] = [];
  registrosGtin14: any[] = [];
  bandera: number = 0;
  dataSource: any[] = [];
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
    { field: 'codbar', headerName: 'GTIN UV', width: 140 },
    { field: 'presentacion', headerName: 'P', width: 50 },
    { field: 'descripcion', headerName: 'Descripción', width: 180 },
    { field: 'fecha', headerName: 'Fecha', width: 100 },
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
    private fb: FormBuilder,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private productoService: ProductoService,
    private codigos14Service: Codigos14Service
  ) {
    // Inicializar formulario reactivo
    this.gtinForm = this.fb.group({
      cliente: [''],
      ruc: [''],
      prefijo: [''],
      gln: [''],
      gtin12Nac: [false],
      gtin13Nac: [false],
      gtin12Int: [false],
      gtin13Int: [false],
      usarUnidadVenta: [false],
      producto: [''],
      categoria: [''],
      tipoEmpaque: ['']
    });
  }

  ngOnInit(): void {
    // Escuchar cambio de cliente
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      if (cliente?.clientes_codigo) {
        this.cargarProductos(cliente.clientes_codigo);
      }
    });
  }

  // Cambiar pestaña activa
  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  // Filtrar registros por prefijo y búsqueda
  filtrarRegistros() {
    return this.registros.filter(r =>
      (!this.filtroPrefijo || r.prefijo.includes(this.filtroPrefijo)) &&
      (!this.busqueda || r.descripcion?.toLowerCase().includes(this.busqueda.toLowerCase()))
    );
  }

  // Seleccionar producto UV y cargar su GTIN-14
  seleccionarRegistro(registro: any) {
    this.registroSeleccionado = registro;
    this.codigoSeleccionado = registro.codbar;
    this.cargarCodigos14PorGtin(registro.codbar);

  }

  // Navegar a pantalla de UV individual
  irAUvIndividual(): void {
    this.router.navigate(['/menuProductos/uvIndividual']);
  }

  // Salir a página de clientes
  salir(): void {
    this.router.navigate(['/pages/clientes']);

  }

  // Cargar productos por cliente
  cargarProductos(codigoCliente: number): void {
    this.productoService.getProductosPorCliente(codigoCliente).subscribe({
      next: (productos: Producto[]) => {
        this.registros = productos.map(p => ({
          id: p.IdProducto,
          empresa: p.clienteNombres || '',
          prefijo: p.codpre || '',
          tipogtin: p.tgin || '',
          estado: p.Activo ? 'ACTIVO' : 'INACTIVO',
          codbar: p.codbar || '',
          presentacion: p.p || '',
          descripcion: p.Despro || '',

          fecha: (() => {
            const fecha = new Date(p.Fecing);
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const anio = fecha.getFullYear();
            return `${dia}/${mes}/${anio}`;
          })(),

          _fecha: this.formatearFecha(p.Fecing),
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

  // Cargar GTIN-14 relacionados al código seleccionado
  cargarCodigos14PorGtin(gtin: string): void {
    this.codigos14Service.getPorGtin(gtin).subscribe({

      next: (codigos) => {
        this.registrosGtin14 = codigos.map(c => ({
          id: c.id_codigos14,
          g14: c.g14 || '',
          codbar: c.codbar || '',
          prefijo: c.codpre || '',
          factor: c.unidad || '',
          presentacion: c.presentacion || '',
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
  irBloque(): void {
    this.router.navigate(['/menuProductos/bloque']);
  }

 }

