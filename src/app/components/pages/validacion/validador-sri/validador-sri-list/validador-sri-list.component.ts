import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { ClienteUpdateDto, UpdateClienteRequest, UpdateClientesMasivoRequest } from 'src/app/interfaces/requests/update-cliente-request';
import { PageEvent } from '@angular/material/paginator';
import { ClienteBasicoResponse } from 'src/app/interfaces/responses/cliente-validar-response';
import { PermissionsService } from 'src/app/services/permission.service';
import { ZonaService, Zona } from 'src/app/services/zona.service';

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
  ciudades: CiudadResumen[] = [];
  zonas: Zona[] = [];
  // Caché para guardar el estado de la validacion
  private validacionesCache: Map<number, ClienteValidadoDTO> = new Map();

  seleccionados: { [codigo: number]: boolean } = {};
  actualizarSeleccionados: { [codigo: number]: boolean } = {};
  marcarTodos: boolean = false;
  numeroRegistros = 0;

  currentPage: number = 0; // Material usa 0-based index
  pageSize: number = 50;
  totalItems: number = 0;
  pageSizeOptions: number[] = [10, 25, 50, 100];

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
    private validacionService: ValidacionService,
    public permissions: PermissionsService,
    private cdr: ChangeDetectorRef,
    private zonaService: ZonaService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.zonaService.obtenerZona().subscribe({
      next: (zonas) => {
        this.zonas = zonas;
      },
      error: (error) => {
        console.error('Error cargando zonas:', error);
      }
    });
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

    const data = this.clientes.map((c: ClienteValidacionExtendido) => ({
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

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarDatos();
  }
  private mapearClienteBasico(cliente: ClienteBasicoResponse): ClienteValidacionExtendido {
    return {
      clientes_codigo: cliente.cliente_codigo,
      nomcli: cliente.razon_social,
      ruc: cliente.ruc,
      representante: cliente.representante,
      idEstadoEmpresa: cliente.estado_empresa,
      ciudad: cliente.ciudad,
      canton: cliente.canton,
      provincia: cliente.provincia,
      zonaNombre: cliente.zona,
      fecnac: cliente.fecha_inicio,
      fechaCeseAct: undefined,
      motivoCeseAct: undefined,
      validacionSRI: undefined,

      // Campos adicionales requeridos por ClienteIndividual
      dircli: '',
      concli: '',
      email: '',
      telefono: '',
      telefono1: '',
      razonSocial: cliente.razon_social,
      fax: '',
      fecing: undefined,
      idCiudad: 0,
      idZona: 0,
    } as unknown as ClienteValidacionExtendido;
  }
  cargarDatos(): void {
    const dialogRef = this.mostrarCargando('Cargando datos', 'Espere...');
    const pageForApi = this.currentPage + 1;

    this.validacionService.getClientesBasicos(
      pageForApi,
      this.pageSize,
      this.letraFiltro || undefined,
      this.zonaFiltro || undefined,
      this.textoBusqueda || undefined
    ).subscribe({
      next: (response) => {
        if (response.type === 'success' && response.data) {
          this.clientes = response.data.items.map(cliente => {
            const clienteMapeado = this.mapearClienteBasico(cliente);

            // Aplicar datos del caché si existen
            if (this.validacionesCache.has(clienteMapeado.clientes_codigo)) {
              clienteMapeado.validacionSRI = this.validacionesCache.get(clienteMapeado.clientes_codigo);
            }

            return clienteMapeado;
          });
          this.totalItems = response.data.totalItems;
          dialogRef.close();
        }
      },
      error: (error) => {
        dialogRef.close();
        this.mostrarError('Error de carga', 'Ocurrió un error al cargar los clientes.');
      }
    });
  }

  aplicarFiltros(): void {
    this.currentPage = 0; // Reiniciar a primera página
    this.validacionesCache.clear();
    this.cargarDatos();
  }

  toggleSeleccionTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.marcarTodos = checked;
    this.clientes.forEach((cliente: ClienteValidacionExtendido) => {
      this.seleccionados[cliente.clientes_codigo] = checked;
    });
  }

  toggleSeleccionUno(clienteId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.seleccionados[clienteId] = checked;
    this.marcarTodos = this.clientes.every((cliente: ClienteValidacionExtendido) =>
      this.seleccionados[cliente.clientes_codigo]
    );
  }

  toggleActualizarTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      // ✅ VALIDACIÓN: Solo marcar los que tienen validación en caché
      this.validacionService.getClientesIdsFiltrados(
        this.letraFiltro || undefined,
        this.zonaFiltro || undefined,
        this.textoBusqueda || undefined
      ).subscribe({
        next: (idsResponse) => {
          if (idsResponse.data) {
            idsResponse.data.forEach(id => {
              // ✅ Solo marcar si tiene datos validados en caché
              if (this.validacionesCache.has(id)) {
                this.actualizarSeleccionados[id] = true;
              }
            });
          }
        }
      });
    } else {
      // Desmarcar todos
      this.actualizarSeleccionados = {};
    }
  }

  toggleActualizarUno(clienteId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.actualizarSeleccionados[clienteId] = checked;
  }

  validarSeleccionados(): void {
    const loadingRef = this.mostrarCargando('Obteniendo clientes', 'Preparando validación...');

    // Primero obtener TODOS los IDs que cumplen los filtros actuales
    this.validacionService.getClientesIdsFiltrados(
      this.letraFiltro || undefined,
      this.zonaFiltro || undefined,
      this.textoBusqueda || undefined
    ).subscribe({
      next: (idsResponse) => {
        if (!idsResponse.data || idsResponse.data.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin datos', 'No hay clientes que cumplan los filtros.');
          return;
        }
        const idsSeleccionados = idsResponse.data.filter(id => this.seleccionados[id]);

        if (idsSeleccionados.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin selección', 'No hay clientes seleccionados para validar.');
          return;
        }

        const totalClientes = idsSeleccionados.length;

        // Mostrar confirmación
        loadingRef.close();
        const confirmRef = this.dialog.open(CustomMessageBoxComponent, {
          data: <MessageBoxData>{
            title: 'Confirmar Validación Masiva',
            message: `¿Desea validar ${totalClientes} clientes que cumplen los filtros actuales?`,
            type: 'warning',
            confirmText: 'Sí, validar',
            cancelText: 'Cancelar',
            showCancel: true
          }
        });

        confirmRef.afterClosed().subscribe(confirmed => {
          if (confirmed) {
            this.ejecutarValidacionMasiva(idsSeleccionados);
          }
        });
      },
      error: () => {
        loadingRef.close();
        this.mostrarError('Error', 'No se pudieron obtener los IDs de clientes.');
      }
    });
  }

  //Valida masivamente con el backend nuevo
  private ejecutarValidacionMasiva(ids: number[]): void {
    const loadingRef = this.mostrarCargando(
      'Validando Registros',
      `Procesando ${ids.length} clientes...`
    );

    this.validacionService.validarMasivo(ids).subscribe({
      next: (res) => {
        res.data.forEach(validado => {
          this.validacionesCache.set(validado.clienteId, validado.datosValidados);

          // Actualizar en la página actual si existe
          const cliente = this.clientes.find(c => c.clientes_codigo === validado.clienteId);
          if (cliente) {
            cliente.validacionSRI = validado.datosValidados;
          }
        });
        this.clientes = [...this.clientes];
        this.cdr.detectChanges(); //En lugar de cargarDatos()

        loadingRef.close();
        this.mostrarExito(
          'Validación completada',
          `Se validaron ${res.data.length} clientes correctamente.`
        );
      },
      error: () => {
        loadingRef.close();
        this.mostrarError('Error de validación', 'Ocurrió un error al validar los clientes.');
      }
    });
  }

  validarUno(clienteId: number): void {
    const loadingRef = this.mostrarCargando('Validando Cliente', 'Espere mientras se valida el cliente...');

    this.validacionService.validarUno(clienteId).subscribe({
      next: (res) => {
        const cliente = this.clientes.find(c => c.clientes_codigo === clienteId);
        if (cliente && res.data) {
          cliente.validacionSRI = res.data;
          this.validacionesCache.set(clienteId, res.data);
          this.clientes = [...this.clientes];
          this.cdr.detectChanges(); // ✅ Forzar detección de cambios
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
    const loadingRef = this.mostrarCargando('Verificando datos', 'Buscando clientes validados...');

    // 1️⃣ Primero: Obtener TODOS los IDs que cumplen los filtros actuales
    this.validacionService.getClientesIdsFiltrados(
      this.letraFiltro || undefined,
      this.zonaFiltro || undefined,
      this.textoBusqueda || undefined
    ).subscribe({
      next: (idsResponse) => {
        if (!idsResponse.data || idsResponse.data.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin datos', 'No hay clientes que cumplan los filtros.');
          return;
        }

        // 2️⃣ Filtrar solo los IDs que el usuario marcó para actualizar
        // (o TODOS si tiene "Marcar actualización" activado)
        const idsParaActualizar = idsResponse.data.filter(id =>
          this.actualizarSeleccionados[id] && this.validacionesCache.has(id)
        );
        const clientesValidados = idsParaActualizar.filter(id => this.validacionesCache.has(id));

        if (clientesValidados.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin validación', 'Los clientes seleccionados no tienen datos validados del SRI.');
          return;
        }

        if (idsParaActualizar.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin selección', 'No hay clientes marcados para actualizar.');
          return;
        }
        if (idsParaActualizar.length === 0) {
          loadingRef.close();
          this.mostrarError('Sin selección', 'No hay clientes marcados para actualizar.');
          return;
        }

        // 3️⃣ Ahora necesitamos obtener los datos validados del backend
        loadingRef.close();
        const confirmRef = this.dialog.open(CustomMessageBoxComponent, {
          data: <MessageBoxData>{
            title: 'Confirmar Actualización Masiva',
            message: `¿Desea actualizar ${idsParaActualizar.length} clientes seleccionados?`,
            type: 'warning',
            confirmText: 'Sí, actualizar',
            cancelText: 'Cancelar',
            showCancel: true
          }
        });

        confirmRef.afterClosed().subscribe(confirmed => {
          if (confirmed) {
            this.ejecutarActualizacionMasivaCompleta(idsParaActualizar);
          }
        });
      },
      error: () => {
        loadingRef.close();
        this.mostrarError('Error', 'No se pudieron obtener los IDs de clientes.');
      }
    });
  }

  private ejecutarActualizacionMasivaCompleta(ids: number[]): void {
    const dialogRef = this.mostrarCargando(
      'Preparando actualización',
      `Procesando ${ids.length} clientes...`
    );

    // ✅ USAR DIRECTAMENTE EL CACHÉ, NO VALIDAR DE NUEVO
    const clientesActualizar: ClienteUpdateDto[] = ids
      .filter(id => this.validacionesCache.has(id)) // Solo los que tienen datos en caché
      .map(id => {
        const validado = this.validacionesCache.get(id)!;
        const estado = validado.estadoContribuyente?.toUpperCase();
        const motivo = validado.motivoCese?.toUpperCase();

        return {
          clienteId: id,
          data: {
            razonSocial: validado.razonSocial || '',
            nomCli: validado.razonSocial || '',
            representante: validado.representante || '',
            idEstadoEmpresa: estado === 'ACTIVO' ? 1 : (estado === 'SUSPENDIDO' || estado === 'PASIVO' ? 2 : undefined),
            fechaCeseAct: this.prepararFechaHoraParaBackend(validado.fechaCeseActividad),
            motivoCeseAct: (estado === 'SUSPENDIDO' || estado === 'PASIVO')
              ? this.limpiarCampoTexto(`${estado} - ${motivo ?? ''}`)
              : '',
            fecnac: this.prepararFechaParaBackend(validado.fechaInicioActividad)
          }
        };
      });

    // Validar que hay clientes para actualizar
    if (clientesActualizar.length === 0) {
      dialogRef.close();
      this.mostrarError(
        'Sin datos cargados del SRI',
        'Los clientes seleccionados no tienen datos validados. Primero debe validarlos.'
      );
      return;
    }

    dialogRef.close();
    const updateDialog = this.mostrarCargando(
      'Actualizando registros',
      `Procesando ${clientesActualizar.length} clientes...`
    );

    // UNA SOLA petición HTTP
    const request: UpdateClientesMasivoRequest = {
      clientes: clientesActualizar
    };

    this.validacionService.updateClientesMasivo(request).subscribe({
      next: (res) => {
        updateDialog.close();

        // Limpiar caché de los actualizados exitosamente
        clientesActualizar.forEach(c => this.validacionesCache.delete(c.clienteId));

        this.mostrarExito(
          'Actualización completa',
          `✅ ${res.data.actualizados} clientes actualizados.${res.data.errores > 0 ? ` ⚠️ ${res.data.errores} errores.` : ''}`
        );

        this.cargarDatos();
      },
      error: (error) => {
        updateDialog.close();
        console.error('Error en actualización masiva:', error);
        this.mostrarError('Error', 'Ocurrió un error durante la actualización masiva.');
      }
    });
  }

  // private ejecutarActualizacionMasiva(ids: number[]): void {
  //   const dialogRef = this.mostrarCargando(
  //     'Actualizando registros',
  //     `Procesando ${ids.length} clientes...`
  //   );

  //   // Obtener datos validados de los clientes actuales
  //   const clientesActualizar = this.clientes.filter(
  //     c => ids.includes(c.clientes_codigo) && c.validacionSRI
  //   );

  //   if (clientesActualizar.length === 0) {
  //     dialogRef.close();
  //     this.mostrarError('Sin datos', 'Los clientes seleccionados no tienen datos validados.');
  //     return;
  //   }

  //   let actualizados = 0;
  //   const peticiones = clientesActualizar.map(cliente => {
  //     const request: UpdateClienteRequest = {
  //       razonSocial: cliente.validacionSRI?.razonSocial || '',
  //       nomCli: cliente.validacionSRI?.razonSocial || '',
  //       representante: cliente.validacionSRI?.representante || '',
  //       idEstadoEmpresa: (() => {
  //         const estado = cliente.validacionSRI?.estadoContribuyente?.toUpperCase();
  //         if (estado === 'ACTIVO') return 1;
  //         if (estado === 'SUSPENDIDO' || estado === 'PASIVO') return 2;
  //         return undefined;
  //       })(),
  //       fechaCeseAct: this.prepararFechaHoraParaBackend(cliente.validacionSRI?.fechaCeseActividad),
  //       motivoCeseAct: (() => {
  //         const estado = cliente.validacionSRI?.estadoContribuyente?.toUpperCase();
  //         const motivo = cliente.validacionSRI?.motivoCese?.toUpperCase();
  //         if (estado === 'SUSPENDIDO' || estado === 'PASIVO') {
  //           return this.limpiarCampoTexto(`${estado} - ${motivo ?? ''}`);
  //         }
  //         return '';
  //       })(),
  //       fecnac: this.prepararFechaParaBackend(cliente.validacionSRI?.fechaInicioActividad)
  //     };

  //     return this.validacionService.updateCliente(cliente.clientes_codigo, request)
  //       .toPromise()
  //       .then(() => {
  //         actualizados++;
  //       });
  //   });

  //   Promise.all(peticiones)
  //     .then(() => {
  //       dialogRef.close();
  //       this.mostrarExito(
  //         'Actualización completa',
  //         `${actualizados} clientes actualizados correctamente.`
  //       );
  //       this.cargarDatos();
  //     })
  //     .catch((error) => {
  //       dialogRef.close();
  //       console.error('Error en actualización masiva:', error);
  //       this.mostrarError('Error', 'Ocurrió un error durante la actualización masiva.');
  //     });
  // }

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
