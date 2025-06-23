import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatOptionModule } from '@angular/material/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { SsccResponse } from 'src/app/interfaces/responses/sscc-response';
import { SsccService } from 'src/app/services/sscc.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { PrefijoService } from 'src/app/services/prefijo.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { GenerateSsccRequest } from 'src/app/interfaces/requests/generate-sscc-request';
import { UsuarioService } from 'src/app/services/usuario.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/util/messages/custom-message-box.component';
interface SsccTablaView { //Interfaz auxiliar para poder mapear solamente lo que se requiere
  empresa: string;
  prefijo: string;
  identificadorEmpaque: string;
  sscc: string;
  fecha: string;
  estado: string;
  usuario: string;
  seleccionado: boolean;
}
@Component({
  selector: 'app-nuevo-sscc',
  standalone: true,
  templateUrl: './nuevo-sscc.component.html',
  styleUrls: ['./nuevo-sscc.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatOptionModule,
    MatDatepickerModule,
    MatPaginatorModule
  ]
})
export class NuevoSsccComponent implements OnInit {
  activeTab: string = 'Listado';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  currentDateTime: string = '';

  // LISTADO
  columnas: string[] = ['indice', 'empresa', 'prefijo', 'identificadorEmpaque', 'sscc', 'fecha', 'estado', 'usuario', 'opcion', 'seleccionar'];
  registros = [
    { empresa: 'Empresa A', prefijo: '12345', identificadorEmpaque: 'EMPK001', sscc: 'SSCC001', fecha: new Date(), estado: 'Activo', usuario: 'admin', seleccionado: false },
    { empresa: 'Empresa B', prefijo: '67890', identificadorEmpaque: 'EMPK002', sscc: 'SSCC002', fecha: new Date(), estado: 'Inactivo', usuario: 'usuario1', seleccionado: false }
  ];
  // dataFiltrada = new MatTableDataSource(this.registros);
  prefijosDisponibles: { id: number, codpre: string }[] = [];
  filtroTexto = '';
  filtroPrefijo = '';
  filtroBusqueda = '';
  ssccsData: SsccTablaView[] = [];
  dataFiltrada = new MatTableDataSource<SsccTablaView>([]);
  totalItems = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50, 100];

  // GENERAR
  formSSCC: FormGroup;
  columnasGeneradas: string[] = ['ia', 'sscc'];
  empaques = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  dataGenerada = new MatTableDataSource<any>([]);

  // REPORTES
  formReporte: FormGroup;
  estados = ['Activo', 'Inactivo'];
  operadores = [
    { simbolo: '=', control: 'opIgual' },
    { simbolo: '=<', control: 'opMenorIgual' },
    { simbolo: '>', control: 'opMayor' },
    { simbolo: 'Entre', control: 'opEntre' }
  ];

  constructor(
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder,
    private ssccService: SsccService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private prefijoService: PrefijoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog
    ) {
    // FORM GENERAR
    this.formSSCC = this.fb.group({
      codigoCliente: [''],
      cliente: [''],
      ruc: [''],
      prefijo: [''],
      producto: [''],
      empaque: [''],
      serie: [false],
      inicio: [''],
      fin: [''],
      codigosGenerados: ['']
    });

    // FORM REPORTES
    this.formReporte = this.fb.group({
      prefijo: [''],
      estado: [''],
      fecha: [''],
      desde: [''],
      hasta: [''],
      opIgual: [false],
      opMenorIgual: [false],
      opMayor: [false],
      opEntre: [false]
    });

    // RESPONSIVE
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();

    if (!cliente) {
      this.mostrarMensaje({
        title: 'Cliente no seleccionado',
        message: 'Debes seleccionar al menos un cliente para continuar.',
        type: 'warning'
      });
      this.router.navigate(['/pages/clientes']);
      return;
    }


    // Setea campos cliente en el formulario de generación
    this.formSSCC.patchValue({
      codigoCliente: cliente.clientes_codigo,
      cliente: cliente.nomcli,
      ruc: cliente.ruc
    });

    // Cargar SSCCs y prefijos de ese cliente
    this.cargarSSCCs();
  }

  // ========== LISTADO ==========
  filtrar(): void {
    this.dataFiltrada.data = this.ssccsData.filter(r => {
      const coincideTexto = this.filtroTexto ? JSON.stringify(r).toLowerCase().includes(this.filtroTexto.toLowerCase()) : true;
      const coincidePrefijo = this.filtroPrefijo ? r.prefijo === this.filtroPrefijo : true;
      const coincideBusqueda = this.filtroBusqueda ? JSON.stringify(r).toLowerCase().includes(this.filtroBusqueda.toLowerCase()) : true;
      return coincideTexto && coincidePrefijo && coincideBusqueda;
    });
  }



  //Carga todos los datos desde el backend
  cargarSSCCs(page: number = 0, size: number = 10): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;

    this.prefijoService.obtenerPrefijosPorClienteCodigo(cliente.clientes_codigo).subscribe({
      next: (prefijos) => {
        
        const codigosUnicos = new Map();
        for (const p of prefijos) {
          if (!codigosUnicos.has(p.codpre)) {
            codigosUnicos.set(p.codpre, { id: p.id_prefijos, codpre: p.codpre });
          }
        }
        this.prefijosDisponibles = Array.from(codigosUnicos.values());
        this.prefijosDisponibles = prefijos.map(p => ({
          id: p.id_prefijos,
          codpre: p.codpre
        }));

        this.ssccService.getByCliente(cliente.clientes_codigo, page + 1, size).subscribe({
          next: (response) => {
            this.ssccsData = response.data.items.map((item: any) => {
              const codpre = this.prefijosDisponibles.find(p => p.id === item.id_prefijo)?.codpre || 'N/A';

              return {
                empresa: cliente?.nomcli || 'ECOP', // Cliente siempre viene de servicio
                prefijo: codpre,
                identificadorEmpaque: item.indicador,
                sscc: item.sscc_completo,
                fecha: item.fecha_creacion,
                estado: item.estado ? 'Activo' : 'Inactivo',
                usuario: item.usuario,
                seleccionado: false
              };
            });

            this.totalItems = response.data.totalItems;
            this.pageIndex = response.data.page - 1;
            this.pageSize = response.data.pageSize;
            this.filtrar();
          },
          error: (err) => console.error('❌ Error al cargar SSCCs:', err)
        });
      },
      error: (err) => console.error('❌ Error al cargar prefijos:', err)
    });
  }

  
  cargarPrefijosPorCliente(): void {
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    if (!cliente) return;

    this.prefijoService.obtenerPrefijosPorClienteCodigo(cliente.clientes_codigo).subscribe({
      next: (res) => {
        //Siempre limpiar antes de asignar
        this.prefijosDisponibles = []; 
        this.prefijosDisponibles = res.map(p => ({
          id: p.id_prefijos,
          codpre: p.codpre
        }));
      },
      error: (err) => console.error('❌ Error al cargar prefijos:', err)
    });
  }

  verDetalle(row: any): void {
    this.mostrarMensaje({
      title: 'Detalle',
      message: `Mostrando detalle para: ${row.empresa}`,
      type: 'info'
    });

  }

  eliminarSeleccionados(): void {
    this.registros = this.registros.filter(r => !r.seleccionado);
    this.filtrar();
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
  }

  salir(): void {
    this.router.navigate(['/pages/clientes']);
  }

  // ========== GENERAR ==========
  nuevo(): void {
    this.formSSCC.reset();
    this.dataGenerada.data = [];
  }

  generar(): void {
    const inicio = parseInt(this.formSSCC.get('inicio')?.value || '1', 10);
    const cantidad = parseInt(this.formSSCC.get('producto')?.value || '0', 10); // default en 0

    if (isNaN(cantidad) || cantidad <= 0) {
      this.mostrarMensaje({
        title: 'Cantidad inválida',
        message: '⚠️ Debes ingresar un número válido de productos a codificar.',
        type: 'warning'
      });
      return;
    }

    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    const usuario = this.usuarioService.getUsuarioActual();

    if (!cliente || !usuario) {
      this.mostrarMensaje({
        title: 'Error de sesión',
        message: 'Cliente o usuario no disponible.',
        type: 'error'
      });
      return;
    }

    const payload: GenerateSsccRequest = {
      id_prefijo: this.formSSCC.get('prefijo')?.value,
      id_cliente: cliente.clientes_codigo,
      indicador: this.formSSCC.get('empaque')?.value,
      producto_codificado: this.formSSCC.get('producto')?.value.toString(),
      serie: this.formSSCC.get('serie')?.value || false,
      secuencia_inicio: inicio,
      cantidad_codigos: cantidad,
      usuario: usuario.nombre_usuario
    };

    this.ssccService.generate(payload).subscribe({
      next: (res) => {
        const lista = res.data.map((codigo: string, index: number) => ({
          ia: index + 1,
          sscc: codigo
        }));
        this.dataGenerada.data = lista;
        this.formSSCC.patchValue({ codigosGenerados: lista.length });
        this.mostrarMensaje({
          title: 'Códigos generados',
          message: `✅ Se generaron ${lista.length} códigos correctamente.`,
          type: 'success'
        });
      },
      error: (err) => {
        console.error('Error al generar SSCCs:', err);
        this.mostrarMensaje({
          title: 'Error inesperado',
          message: 'Error al generar los códigos.',
          type: 'error'
        });
      }
    });
  }

  grabar(): void {
    console.log('Guardando...', this.formSSCC.value, this.dataGenerada.data);
  }

  // ========== REPORTES ==========
  exportar(): void {
    const filtros = this.formReporte.value;
    console.log('📤 Exportando con filtros:', filtros);
    // Aquí se integraría exportación a Excel/PDF o consulta a backend.
  }

  //Paginador
  onPageChange(event: any): void {
    this.cargarSSCCs(event.pageIndex, event.pageSize);
  }

  // ========== UTILIDADES ==========
  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  updateDateTime(): void {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  mostrarMensaje(data: MessageBoxData): void {
  this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data
    });
  }

}
