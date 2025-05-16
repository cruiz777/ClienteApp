import { Component, OnInit } from '@angular/core';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { CiudadService } from 'src/app/services/ciudad.service';
import { CiudadResumen } from 'src/app/interfaces/responses/ciudad-response';
import { ClienteValidadoDTO } from 'src/app/interfaces/requests/cliente-validado';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';

type ClienteValidacionExtendido = ClienteIndividual & {
  ciudad: string;
  canton: string;
  provincia: string;
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

  constructor(
    private clienteService: ClienteService,
    private ciudadService: CiudadService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const dialogRef = this.mostrarCargando('Cargando datos', 'Espere mientras se cargan los datos de clientes y ciudades...');

    this.ciudadService.getCiudades().subscribe({
      next: (ciudades) => {
        this.ciudades = ciudades;

        this.clienteService.getClientesDetalles().subscribe({
          next: (clientes) => {
            this.clientes = clientes.map(cliente => {
              const ciudadInfo = this.ciudades.find(c => c.id === cliente.idCiudad);

              return {
                ...cliente,
                ciudad: ciudadInfo?.ciudad ?? '',
                canton: ciudadInfo?.canton ?? '',
                provincia: ciudadInfo?.provincia ?? ''
              };
            });
            this.seleccionados = {}; // ← limpia selección
            this.actualizarSeleccionados = {}; // ← limpia checkboxes de actualización
            this.marcarTodos = false; // ← reinicia estado del checkbox global

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
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const letra = this.letraFiltro.trim().toLowerCase();
      const estado = this.estadoFiltro.trim().toLowerCase();
      const zona = this.zonaFiltro.trim().toLowerCase();
      const texto = this.textoBusqueda.trim().toLowerCase();

      const coincideLetra = !letra || cliente.nomcli?.toLowerCase().startsWith(letra);
      const coincideEstado = !estado || cliente.estadoNombre?.toLowerCase().includes(estado);
      const coincideZona = !zona || cliente.zonaReferencia?.toLowerCase().includes(zona);
      const coincideBusqueda = !texto || (
        cliente.nomcli?.toLowerCase().includes(texto) ||
        cliente.ruc?.toLowerCase().includes(texto) ||
        cliente.representante?.toLowerCase().includes(texto)
      );

      const rucValido = /^\d{13}$/.test(cliente.ruc ?? '');
      return coincideLetra && coincideEstado && coincideZona && coincideBusqueda && rucValido;
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
      const request = {
        razonSocial: cliente.validacionSRI?.razonSocial,
        representante: cliente.validacionSRI?.representante,
        idEstadoEmpresa: (() => {
          const estado = cliente.validacionSRI?.estadoContribuyente?.toUpperCase();
          if (estado === 'ACTIVO') return 1;
          if (estado === 'SUSPENDIDO' || estado === 'PASIVO') return 2;
          return undefined;
        })(),

        fecCeseAct: this.limpiarCampoFecha(cliente.validacionSRI?.fechaCeseActividad),
        motivoCeseAct: this.limpiarCampoTexto(cliente.validacionSRI?.motivoCese),
        fecnac: cliente.validacionSRI?.fechaInicioActividad || undefined
      };

      return this.clienteService.actualizarCliente(cliente.clientes_codigo, request).toPromise().then(() => {
        actualizados++;
      });
    });

    Promise.all(peticiones)
      .then(() => {
        dialogRef.close();
        this.mostrarExito('Actualización completa', `${actualizados} clientes actualizados correctamente.`);
        this.cargarDatos();
      })
      .catch(() => {
        dialogRef.close();
        this.mostrarError('Error', 'Ocurrió un error durante la actualización masiva.');
      });
  }

  onBuscar(): void {
    this.aplicarFiltros();
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

  private limpiarCampoFecha(fecha: string | null | undefined): string | null {
    if (!fecha || fecha.trim() === '' || fecha.startsWith('0001')) return null;
    return fecha; // se envía como string ISO, el backend lo convierte a DateOnly
  }
  private limpiarCampoTexto(texto: string | null | undefined): string {
    return (!texto || texto.trim() === '') ? '' : texto.trim();
  }

}
