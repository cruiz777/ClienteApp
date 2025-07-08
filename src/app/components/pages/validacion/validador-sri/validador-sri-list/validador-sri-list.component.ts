import { Component, OnInit } from '@angular/core';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { ClienteValidadoDTO } from 'src/app/interfaces/requests/cliente-validado';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { LogoService } from 'src/app/services/logo.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { ExportService } from 'src/app/services/export.service';
import * as moment from 'moment';
import { ValidacionService } from 'src/app/services/validacion.service';
import { UpdateClienteRequest } from 'src/app/interfaces/requests/update-cliente-request';

type ClienteValidacionExtendido = ClienteIndividual & {
  ciudad: string;
  canton: string;
  provincia: string;
  zonaNombre: string;
  validacionSRI?: ClienteValidadoDTO;
};

@Component({
  selector: 'app-validador-sri-list',
  templateUrl: './validador-sri-list.component.html',
  styleUrls: ['./validador-sri-list.component.css']
})
export class ValidacionSriListComponent implements OnInit {
  clientes: ClienteValidacionExtendido[] = [];
  clientesFiltrados: ClienteValidacionExtendido[] = [];
  ciudades: CiudadResumen[] = [];

  seleccionados: { [codigo: number]: boolean } = {};
  actualizarSeleccionados: { [codigo: number]: boolean } = {};
  marcarTodos: boolean = false;
  numeroRegistros = 0;

  letraFiltro: string = '';
  estadoFiltro: string = '';
  zonaFiltro: string = '';
  textoBusqueda: string = '';
  logoUrl: string = '';
  constructor(
    private clienteService: ClienteService,
    private ciudadService: CiudadService,
    private dialog: MatDialog,
    private logoService: LogoService,
    private empresaService: EmpresaService,
    private exportService: ExportService,
    private validacionService: ValidacionService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
        this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas.length > 0 && empresas[0].empresaLogo) {
          this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
        }
      }
    });
  }
  exportar(tipo: 'excel' | 'pdf'): void {
    const headers = [
      'Código', 'RUC', 'Razón Social', 'Representante', 'Estado',
      'Ciudad', 'Cantón', 'Provincia', 'Zona', 'Fecha Inicio', 'Fecha Cese', 'Motivo Cese'
    ];

    const columns = [
      'clientes_codigo', 'ruc', 'nomcli', 'representante', 'estadoTexto',
      'ciudad', 'canton', 'provincia', 'zonaNombre', 'fecnac', 'fechaCeseAct', 'motivoCeseAct'
    ];

    const data = this.clientesFiltrados.map(c => ({
      clientes_codigo: c.clientes_codigo,
      ruc: c.ruc,
      nomcli: c.nomcli,
      representante: c.representante,
      estadoTexto: c.idEstadoEmpresa === 1 ? 'AFILIADO' : (c.idEstadoEmpresa === 2 ? 'DESAFILIADO' : ''),
      ciudad: c.ciudad,
      canton: c.canton,
      provincia: c.provincia,
      zonaNombre: c.zonaNombre,
      fecnac: c.fecnac ? moment(c.fecnac).format('DD/MM/YYYY') : '',
      fechaCeseAct: c.fechaCeseAct ? moment(c.fechaCeseAct).format('DD/MM/YYYY') : '',
      motivoCeseAct: c.motivoCeseAct || ''
    }));

    const options: ExportOptions = {
      data,
      columns,
      headers,
      filename: 'Clientes_Validados_SRI',
      title: 'Listado de Clientes Validados en el SRI',
      logoUrl: this.logoUrl
    };

    tipo === 'excel'
      ? this.exportService.exportarExcel(options)
      : this.exportService.exportarPDF(options);
  }
  cargarDatos(): void {
    const dialogRef = this.mostrarCargando('Cargando datos', 'Espere mientras se cargan los datos de clientes y ciudades...');

    this.ciudadService.getCiudades().subscribe({
      next: (ciudades) => {
        this.ciudades = ciudades;

        this.clienteService.getClientesDetalles().subscribe({
          next: (clientes) => {
            this.clientes = clientes
              .filter(c => Number(c.idEstadoEmpresa) === 1)
              .map(cliente => {
              const ciudadInfo = this.ciudades.find(c => c.id === cliente.idCiudad);
              const zonaNombre = cliente.idZona ? `ZONA ${cliente.idZona}` : '';
              return {
                ...cliente,
                ciudad: ciudadInfo?.ciudad ?? '',
                canton: ciudadInfo?.canton ?? '',
                provincia: ciudadInfo?.provincia ?? '',
                zonaNombre
              };
            });
            this.seleccionados = {};
            this.actualizarSeleccionados = {};
            this.marcarTodos = false;

            this.aplicarFiltros();
            dialogRef.close();
          },
          error: () => {
            dialogRef.close();
            this.mostrarError('Error de carga', 'Ocurrió un error al cargar los clientes.');
          }
        });
      },
      error: () => {
        dialogRef.close();
        this.mostrarError('Error de carga', 'Ocurrió un error al cargar las ciudades.');
      }
    });
  }

  aplicarFiltros(): void {
    const letra = this.letraFiltro.trim().toLowerCase();
    // const estado = this.estadoFiltro.trim().toUpperCase(); // Comparar como texto fijo
    const zona = this.zonaFiltro.trim().toUpperCase();
    const texto = this.textoBusqueda.trim().toLowerCase();

    this.clientesFiltrados = this.clientes.filter(cliente => {
      const coincideLetra = !letra || cliente.nomcli?.toLowerCase().startsWith(letra);
      // const coincideEstado =
      //   !estado ||
      //   (estado === 'AFILIADO' && cliente.idEstadoEmpresa === 1) ||
      //   (estado === 'DESAFILIADO' && cliente.idEstadoEmpresa === 2);
      const coincideZona = !zona || cliente.zonaNombre.toUpperCase() === zona;
      const coincideBusqueda = !texto || (
        cliente.nomcli?.toLowerCase().includes(texto) ||
        cliente.ruc?.toLowerCase().includes(texto) ||
        cliente.representante?.toLowerCase().includes(texto)
      );
      const rucValido = /^\d{13}$/.test(cliente.ruc ?? '');
      return coincideLetra  && coincideZona && coincideBusqueda && rucValido;
    });

    this.numeroRegistros = this.clientesFiltrados.length;
  }

  toggleSeleccionTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.marcarTodos = checked;
    this.clientesFiltrados.forEach(cliente => {
      this.seleccionados[cliente.clientes_codigo] = checked;
    });
  }

  toggleSeleccionUno(clienteId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.seleccionados[clienteId] = checked;
    this.marcarTodos = this.clientesFiltrados.every(cliente => this.seleccionados[cliente.clientes_codigo]);
  }

  toggleActualizarTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.clientesFiltrados.forEach(cliente => {
      if (cliente.validacionSRI) {
        this.actualizarSeleccionados[cliente.clientes_codigo] = checked;
      }
    });
  }

  toggleActualizarUno(clienteId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.actualizarSeleccionados[clienteId] = checked;
  }

  validarSeleccionados(): void {
    const seleccionadosIds = Object.keys(this.seleccionados)
      .filter(id => this.seleccionados[+id])
      .map(id => +id);

    if (seleccionadosIds.length === 0) return;

    const loadingRef = this.mostrarCargando('Validando Registros', 'Por favor espere...');

    this.clienteService.validarMasivo(seleccionadosIds).subscribe({
      next: (res) => {
        res.data.forEach(validado => {
          const cliente = this.clientes.find(c => c.clientes_codigo === validado.clienteId);
          if (cliente) {
            cliente.validacionSRI = validado.datosValidados;
          }
        });
        loadingRef.close();
        this.mostrarExito('Validación completada', 'Los registros seleccionados fueron validados correctamente.');
        this.aplicarFiltros(); // refresca visibilidad
      },
      error: () => {
        loadingRef.close();
        this.mostrarError('Error de validación', 'Ocurrió un error al validar los clientes.');
      }
    });
  }

  validarUno(clienteId: number): void {
    const loadingRef = this.mostrarCargando('Validando Cliente', 'Espere mientras se valida el cliente...');

    this.clienteService.validarUno(clienteId).subscribe({
      next: (res) => {
        const cliente = this.clientes.find(c => c.clientes_codigo === clienteId);
        if (cliente && res.data) {
          cliente.validacionSRI = res.data;
        }
        loadingRef.close();
        this.mostrarExito('Validación exitosa', `El cliente ${clienteId} fue validado correctamente.`);
        this.aplicarFiltros(); // actualiza si cambian los datos
      },
      error: () => {
        loadingRef.close();
        this.mostrarError('Error de validación', 'No se pudo validar el cliente.');
      }
    });
  }

  actualizarSeleccionadosMasivo(): void {
    const seleccionadosIds = Object.keys(this.actualizarSeleccionados)
      .filter(id => this.actualizarSeleccionados[+id])
      .map(id => +id);

    const clientesActualizar = this.clientes.filter(
      c => seleccionadosIds.includes(c.clientes_codigo) && c.validacionSRI
    );

    if (clientesActualizar.length === 0) {
      this.mostrarError('Actualización no válida', 'No hay clientes seleccionados con datos validados.');
      return;
    }

    const dialogRef = this.mostrarCargando('Actualizando registros', 'Espere mientras se actualizan los clientes...');
    let actualizados = 0;

    const peticiones = clientesActualizar.map(cliente => {
        console.log('=== CLIENTE ===', cliente.clientes_codigo);
        console.log('fechaInicioActividad:', cliente.validacionSRI?.fechaInicioActividad);
        console.log('fechaCeseActividad:', cliente.validacionSRI?.fechaCeseActividad);
        console.log('estadoContribuyente:', cliente.validacionSRI?.estadoContribuyente);
        console.log('===============');

        // PROBAR LAS FUNCIONES DIRECTAMENTE
      const fecnacProcesada = this.prepararFechaParaBackend(cliente.validacionSRI?.fechaInicioActividad);
      const fechaCeseProcesada = this.prepararFechaHoraParaBackend(cliente.validacionSRI?.fechaCeseActividad);
      
      console.log('RESULTADO fecnacProcesada:', fecnacProcesada);
      console.log('RESULTADO fechaCeseProcesada:', fechaCeseProcesada);
      console.log('===============');
      const request: UpdateClienteRequest = {
        razonSocial: cliente.validacionSRI?.razonSocial || '',
        nomCli: cliente.validacionSRI?.razonSocial || '',
        representante: cliente.validacionSRI?.representante || '',
        idEstadoEmpresa: (() => {
          const estado = cliente.validacionSRI?.estadoContribuyente?.toUpperCase();
          if (estado === 'ACTIVO') return 1;
          if (estado === 'SUSPENDIDO' || estado === 'PASIVO') return 2;
          return undefined;
        })(),
        fechaCeseAct: this.prepararFechaHoraParaBackend(cliente.validacionSRI?.fechaCeseActividad),
        motivoCeseAct: (() => {
          const estado = cliente.validacionSRI?.estadoContribuyente?.toUpperCase();
          const motivo = cliente.validacionSRI?.motivoCese?.toUpperCase();
          if (estado === 'SUSPENDIDO' || estado === 'PASIVO') {
            return this.limpiarCampoTexto(`${estado} - ${motivo ?? ''}`);
          }
          return '';
        })(),
        fecnac: this.prepararFechaParaBackend(cliente.validacionSRI?.fechaInicioActividad)
      };

      // Log para debug (puedes removerlo después)
      console.log('Request preparado para cliente', cliente.clientes_codigo, request);

      return this.validacionService.updateCliente(cliente.clientes_codigo, request)
        .toPromise()
        .then(() => {
          actualizados++;
        });
    });

    Promise.all(peticiones)
      .then(() => {
        dialogRef.close();
        this.mostrarExito('Actualización completa', `${actualizados} clientes actualizados correctamente.`);
        this.cargarDatos();
      })
      .catch((error) => {
        dialogRef.close();
        console.error('Error en actualización masiva:', error);
        this.mostrarError('Error', 'Ocurrió un error durante la actualización masiva.');
      });
  }

  limpiarFiltros(): void {
    this.letraFiltro = '';
    this.estadoFiltro = '';
    this.zonaFiltro = '';
    this.textoBusqueda = '';
    this.aplicarFiltros();
  }

  mostrarCargando(title: string, message: string) {
    return this.dialog.open(CustomMessageBoxComponent, {
      disableClose: true,
      data: <MessageBoxData>{
        title,
        message,
        type: 'info',
        isLoading: true,
        confirmText: 'Espere...',
        showCancel: false
      }
    });
  }

  mostrarExito(title: string, message: string) {
    this.dialog.open(CustomMessageBoxComponent, {
      data: <MessageBoxData>{
        title,
        message,
        type: 'success',
        confirmText: 'Aceptar',
        showCancel: false
      }
    });
  }

  mostrarError(title: string, message: string) {
    this.dialog.open(CustomMessageBoxComponent, {
      data: <MessageBoxData>{
        title,
        message,
        type: 'error',
        confirmText: 'Cerrar',
        showCancel: false
      }
    });
  }

  private prepararFechaParaBackend(fecha: string | null | undefined): string | null {
    // Si es null, undefined, vacío, o fecha inválida, retornar null
    if (!fecha || 
        fecha.trim() === '' || 
        fecha.startsWith('0001') ||
        fecha === '0001-01-01' ||
        fecha === '1900-01-01') {
      return null;
    }
    
    const fechaTrimmed = fecha.trim();
    
    // Validar que sea una fecha válida
    const fechaObj = new Date(fechaTrimmed);
    if (isNaN(fechaObj.getTime())) {
      return null;
    }
    
    // Para fecnac: retornar solo la fecha (yyyy-MM-dd)
    return fechaObj.toISOString().split('T')[0];
  }

  private prepararFechaHoraParaBackend(fecha: string | null | undefined): string | null {
    // Si es null, undefined, vacío, o fecha inválida, retornar null
    if (!fecha || 
        fecha.trim() === '' || 
        fecha.startsWith('0001') ||
        fecha === '0001-01-01' ||
        fecha === '1900-01-01') {
      return null;
    }
    
    const fechaTrimmed = fecha.trim();
    
    // Validar que sea una fecha válida
    const fechaObj = new Date(fechaTrimmed);
    if (isNaN(fechaObj.getTime())) {
      return null;
    }
    
    // Para fechaCeseAct: retornar fecha y hora ISO completa
    return fechaObj.toISOString();
  }
  

  private limpiarCampoTexto(texto: string | null | undefined): string {
    return (!texto || texto.trim() === '') ? '' : texto.trim();
  }

  refrescarPagina(): void {
  window.location.reload();
}

}
