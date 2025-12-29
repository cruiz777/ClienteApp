import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

// Servicios
import { PerfilesService } from 'src/app/services/perfil.service';
import { SistemaService } from 'src/app/services/sistema.service';
import { ModuloService } from 'src/app/services/modulo.service';
import { MenuService } from 'src/app/services/menu.service';
import { OpcionService } from 'src/app/services/opcion.service';
import { PerfilOpcionService } from 'src/app/services/perfilOpcion.service';

// Interfaces de datos
import { PerfilResponse } from 'src/app/interfaces/responses/perfil-response';
import { SistemaResponse } from 'src/app/interfaces/responses/sistema-response';
import { ModuloResponse } from 'src/app/interfaces/responses/modulo-response';
import { MenuResponse } from 'src/app/interfaces/responses/menu-response';
import { OpcionResponse } from 'src/app/interfaces/responses/opcion-response';

import { PerfilOpcion } from 'src/app/interfaces/requests/perfil-opcion-request';
import { CreateBulkPerfilOption } from 'src/app/interfaces/requests/create-bulk-perfil-options-request';

// Diálogo de mensajes
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';

//Ruta del modal
import { PerfilesFormComponent } from '../perfiles-form/perfiles-form.component';
import { SubMenuService } from 'src/app/services/submenu.service';
import { SubMenuResponse } from 'src/app/interfaces/responses/submenu-response';
import { PermissionsService } from 'src/app/services/permission.service';

interface MenuExtendido extends MenuResponse {
  tieneOpciones: boolean;
  todasAsignadas: boolean;
}
interface ModuloExtendido extends ModuloResponse {
  tieneOpciones: boolean;
  todasAsignadas: boolean;
}

interface SubMenuExtendido extends SubMenuResponse {
  tieneOpciones: boolean;
  todasAsignadas: boolean;
}

@Component({
  selector: 'app-perfiles-list',
  templateUrl: './perfiles-list.component.html',
  styleUrls: ['./perfiles-list.component.css']
})
export class PerfilesListComponent implements OnInit {
  // ==================== Variables de datos ====================
  perfiles: PerfilResponse[] = [];
  sistemas: SistemaResponse[] = [];
  // modulos: ModuloResponse[] = [];
  menus: MenuExtendido[] = [];
  opcionnes: OpcionResponse[] = [];
  // submenus: SubMenuResponse[] = [];
  modulos: ModuloExtendido[] = [];
  submenus: SubMenuExtendido[] = [];
  // ==================== Selección actual ====================
  perfilSeleccionado: number | null = null;
  moduloSeleccionado: number | null = null;
  menuSeleccionado: number | null = null;
  submenuSeleccionado: number | null = null;
  sistemaActivo: string = '';

  opcionesAsignadas: number[] = [];
  botonActivo: string = '';
  filtroPerfil: string = '';
  sistemaAccionesVisible: SistemaResponse | null = null;
  private estadosCache: any = null;
  // ==================== Constructor ====================
  constructor(
    private perfilesService: PerfilesService,
    private sistemaService: SistemaService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionesService: OpcionService,
    private dialog: MatDialog,
    private perfilesOpcionesService: PerfilOpcionService,
    private subMenuService: SubMenuService,
    public permissions: PermissionsService
  ) { }

  // ==================== Inicialización ====================
  ngOnInit(): void {
    this.cargarPerfiles();

    this.sistemaService.getSistemas().subscribe(response => {
      this.sistemas = response.data.filter(s => s.status === true);
      if (this.sistemas.length > 0) {
        this.sistemaActivo = this.sistemas[0].nombre; // Solo marcar el tab activo
      }
    });
  }

  // ==================== Métodos de selección ====================
  seleccionarSistema(nombre: string, idSistema: number): void {
    this.sistemaActivo = nombre;
    this.menus = [];
    this.opcionnes = [];
    if (this.perfilSeleccionado === null) {
      this.modulos = []; // Limpiar módulos si no hay perfil seleccionado
      return; // No cargar módulos
    }
    this.moduloService.getModulosPorSistema(idSistema).subscribe(resp => {
      this.modulos = resp.data.filter(m => m.status === true).map(modulo => ({
        ...modulo,
        tieneOpciones: false,
        todasAsignadas: false
      }));
    });
  }

  seleccionarPerfil(idPerfil: number): void {
    this.perfilSeleccionado = idPerfil;
    this.menus = [];
    this.opcionnes = [];
    this.estadosCache = null; // Limpiar cache

    const sistemaActual = this.sistemas.find(s => s.nombre === this.sistemaActivo);
    if (sistemaActual) {
      this.moduloService.getModulosPorSistema(sistemaActual.id_sistema).subscribe(async resp => {
        this.modulos = resp.data.filter(m => m.status === true).map(modulo => ({
          ...modulo,
          tieneOpciones: false,
          todasAsignadas: false
        }));
        // Una sola consulta para todos los estados
        await this.cargarEstadosCompletos(sistemaActual.id_sistema);
      });
    }
  }
  async cargarEstadosCompletos(idSistema: number): Promise<void> {
    if (!this.perfilSeleccionado) return;

    try {
      const response = await this.perfilesOpcionesService
        .getResumenPerfilSistema(this.perfilSeleccionado, idSistema)
        .toPromise();
      console.log('🔍 Datos del backend:', response?.data);
      this.estadosCache = response?.data;
      this.aplicarEstadosAModulos();
    } catch (error) {
      console.error('Error cargando estados:', error);
    }
  }
  private aplicarEstadosAModulos(): void {
    if (!this.estadosCache) return;
    console.log('📊 Aplicando estados:', this.estadosCache);
    // Aplicar estados a módulos
    this.modulos.forEach(modulo => {
      const estado = this.estadosCache.modulos[modulo.id_modulo];
      if (estado) {
        modulo.tieneOpciones = estado.asignadas > 0;
        modulo.todasAsignadas = estado.totales > 0 && estado.asignadas === estado.totales;
      }
    });

    // Aplicar estados a menús (si están cargados)
    this.menus.forEach(menu => {
      const estado = this.estadosCache.menus[menu.id_menu];
      if (estado) {
        menu.tieneOpciones = estado.asignadas > 0;
        menu.todasAsignadas = estado.totales > 0 && estado.asignadas === estado.totales;
      }
    });

    // Aplicar estados a submenús (si están cargados)
    this.submenus.forEach(submenu => {
      const estado = this.estadosCache.submenus[submenu.id_sub];
      if (estado) {
        submenu.tieneOpciones = estado.asignadas > 0;
        submenu.todasAsignadas = estado.totales > 0 && estado.asignadas === estado.totales;
      }
    });
  }

  seleccionarModulo(idModulo: number): void {
    this.moduloSeleccionado = idModulo;
    this.menuSeleccionado = null;
    this.submenuSeleccionado = null;
    this.submenus = [];
    this.opcionnes = [];

    this.menuService.getMenusPorModulo(idModulo).subscribe(response => {
      this.menus = response.data
        .filter(m => m.status === true)
        .map(menu => ({
          ...menu,
          tieneOpciones: false,
          todasAsignadas: false
        }));

      // Aplicar estados del cache (instantáneo)
      this.aplicarEstadosAModulos();
    });
  }


  // calcular estados de submenus
  seleccionarMenu(idMenu: number): void {
    this.menuSeleccionado = idMenu;
    this.submenuSeleccionado = null;
    this.opcionnes = [];

    this.subMenuService.getSubMenusPorMenu(idMenu).subscribe(response => {
      this.submenus = response.data.filter(sm => sm.status === true).map(submenu => ({
        ...submenu,
        tieneOpciones: false,
        todasAsignadas: false
      }));
      // Aplicar estados del cache (instantáneo)
      this.aplicarEstadosAModulos();
    });
  }

  private actualizarEstadoDelMenuActual(): void {
    if (!this.menuSeleccionado) return;

    const menu = this.menus.find(m => m.id_menu === this.menuSeleccionado);
    if (!menu) return;

    // Usar los submenus cargados para determinar el estado del menú
    const submenusConEstado = this.submenus.filter(sm => (sm as any).tieneOpciones !== undefined);

    if (submenusConEstado.length > 0) {
      menu.tieneOpciones = submenusConEstado.some(sm => (sm as any).tieneOpciones);
      menu.todasAsignadas = submenusConEstado.every(sm => (sm as any).todasAsignadas);
    }
  }
  seleccionarSubMenu(idSub: number): void {
    this.submenuSeleccionado = idSub;
    if (this.perfilSeleccionado === null) return;

    this.opcionesService.getOpcionesPorSubMenu(idSub).subscribe(opcionesResp => {
      const todasLasOpciones = opcionesResp.data.filter(o => o.status === true);

      // Necesitarás crear este método en tu servicio de perfilOpciones
      this.perfilesOpcionesService.getOpcionesPorPerfilYSubmenu(this.perfilSeleccionado!, idSub).subscribe(asignadasResp => {
        const asignadasIds = asignadasResp.data.map(op => op.id_opcion);
        this.opcionesAsignadas = asignadasIds;

        this.opcionnes = todasLasOpciones.map(op => ({
          ...op,
          status: asignadasIds.includes(op.id_opcion)
        }));
      });
    });
  }
  seleccionarBoton(nombre: string): void {
    this.botonActivo = nombre;

    // Remover el estado "activo" después de un corto tiempo
    setTimeout(() => {
      this.botonActivo = '';
    }, 200); // 300 milisegundos (puedes ajustar el tiempo)
  }


  // ==================== Acciones ====================
  onNuevoPerfil(): void {
    const dialogRef = this.dialog.open(PerfilesFormComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado === true) {
        this.cargarPerfiles(); // ← recarga la tabla
      }
    });
  }

  editarPerfil(perfil: PerfilResponse): void {
    const dialogRef = this.dialog.open(PerfilesFormComponent, {
      width: '400px',
      data: {
        id: perfil.id_perfil,
        nombre: perfil.nombre
      }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado === true) {
        this.cargarPerfiles(); // recargar tabla si se editó correctamente
      }
    });
  }



  eliminarPerfil(idPerfil: number): void {
    const data: MessageBoxData = {
      title: '¿Eliminar perfil?',
      message: '¿Estás seguro de que deseas eliminar este perfil?',
      type: 'warning',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      showCancel: true
    };

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data
    }).afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {

        this.perfilesService.softDeletePerfiles(idPerfil).subscribe({
          next: (resp) => {
            if (resp.data === true) {
              this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: 'Eliminado',
                  message: 'El perfil fue eliminado correctamente.',
                  type: 'success',
                  confirmText: 'Aceptar',
                  showCancel: false
                }
              });
              this.cargarPerfiles();
            }
            else {
              this.dialog.open(CustomMessageBoxComponent, {
                width: '400px',
                data: {
                  title: 'No se puede eliminar',
                  message: 'El perfil no puede ser eliminado porque existen usuarios asociados a él.',
                  type: 'info',
                  confirmText: 'Aceptar',
                  showCancel: false
                }
              });
            }
          }
        })

      }
    });
  }

  recalcularEstadosVisuales(tipo: string, id: number): void {
    if (tipo === 'opcion' && this.submenuSeleccionado) {
      this.seleccionarSubMenu(this.submenuSeleccionado);
      // Refrescar niveles superiores
      if (this.menuSeleccionado) this.seleccionarMenu(this.menuSeleccionado);
      if (this.moduloSeleccionado) this.seleccionarModulo(this.moduloSeleccionado);
    }
    if (tipo === 'submenu' && this.menuSeleccionado) {
      this.seleccionarMenu(this.menuSeleccionado);
      if (this.moduloSeleccionado) this.seleccionarModulo(this.moduloSeleccionado);
    }
    if (tipo === 'menu' && this.moduloSeleccionado) {
      this.seleccionarModulo(this.moduloSeleccionado);
    }
  }

  tieneModuloAlgunasOpciones(moduloId: number): boolean {
    const modulo = this.modulos.find(m => m.id_modulo === moduloId) as any;
    if (!modulo) return false;
    return modulo.tieneOpciones && !modulo.todasAsignadas;
  }

  tieneSubMenuAlgunasOpciones(subMenuId: number): boolean {
    const submenu = this.submenus.find(sm => sm.id_sub === subMenuId) as any;
    if (!submenu) return false;
    return submenu.tieneOpciones && !submenu.todasAsignadas;
  }

  //Acciones sobre submenus

  onToggleTodoOpcionesSubMenu(subMenuId: number, marcar: boolean): void {
    if (this.perfilSeleccionado === null) return;

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: subMenuId,
      status: marcar,
      nivel: 'submenu'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: async () => {
        await this.recargarCacheYVista();
        if (this.submenuSeleccionado === subMenuId) {
          this.seleccionarSubMenu(subMenuId);
        }
      },
      error: (err) => console.error('Error en cambio masivo de opciones de submenu:', err)
    });
  }

  esSubMenuCompletamenteAsignado(subMenuId: number): boolean {
    const submenu = this.submenus.find(sm => sm.id_sub === subMenuId) as any;
    return submenu?.todasAsignadas ?? false;
  }

  // ==================== Acciones sobre opciones ====================
  onToggleOpcion(opcion: OpcionResponse): void {
    if (this.perfilSeleccionado === null) return;

    this.perfilesOpcionesService.updateOpcionStatus(
      this.perfilSeleccionado!,
      opcion.id_opcion,
      opcion.status
    ).subscribe({
      next: async () => {
        await this.recargarCacheYVista();
        if (this.submenuSeleccionado) {
          this.seleccionarSubMenu(this.submenuSeleccionado);
        }
      },
      error: (err) => console.error('Error al actualizar la opción:', err)
    });
  }

  private async recargarCacheYVista(): Promise<void> {
    const sistema = this.sistemas.find(s => s.nombre === this.sistemaActivo);
    if (sistema) {
      await this.cargarEstadosCompletos(sistema.id_sistema);
    }
  }

  // onToggleTodoOpciones(menu: MenuExtendido): void {
  //   if (this.perfilSeleccionado === null) return;

  //   const marcar = !menu.todasAsignadas;

  //   const request: CreateBulkPerfilOption = {
  //     id_perfil: this.perfilSeleccionado,
  //     id: menu.id_menu,
  //     status: marcar,
  //     nivel: 'menu'
  //   };

  //   this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
  //     next: () => {
  //       this.opcionnes = [];
  //       this.seleccionarMenu(menu.id_menu);
  //     },
  //     error: (err) => console.error('❌ Error en cambio masivo de opciones de menú:', err)
  //   });
  // }
  onToggleTodoOpciones(menu: MenuExtendido, marcar: boolean): void {
    if (this.perfilSeleccionado === null) return;

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: menu.id_menu,
      status: marcar,
      nivel: 'menu'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: async () => {
        await this.recargarCacheYVista();
        if (this.menuSeleccionado === menu.id_menu) {
          this.seleccionarMenu(menu.id_menu);
        }
      },
      error: (err) => console.error('Error en cambio masivo de opciones de menú:', err)
    });
  }

  onToggleTodoOpcionesModulo(moduloId: number, marcar: boolean): void {
    if (this.perfilSeleccionado === null) return;

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: moduloId,
      status: marcar,
      nivel: 'modulo'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: async () => {
        await this.recargarCacheYVista();
        this.seleccionarModulo(moduloId);
      },
      error: (err) => console.error('Error en cambio masivo de opciones de módulo:', err)
    });
  }


  get perfilesFiltrados(): PerfilResponse[] {
    if (!this.filtroPerfil.trim()) {
      return this.perfiles;
    }

    const termino = this.filtroPerfil.trim().toLowerCase();

    return this.perfiles.filter(perfil =>
      perfil.nombre.toLowerCase().includes(termino) ||
      perfil.id_perfil.toString().includes(termino)
    );
  }

  // ==================== Utilitarios ====================
  // actualizarEstadoDelMenu(): void {
  //   if (this.menuSeleccionado === null) return;

  //   const total = this.opcionnes.length;
  //   const asignadas = this.opcionnes.filter(op => op.status).length;

  //   const menu = this.menus.find(m => m.id_menu === this.menuSeleccionado);
  //   if (menu) {
  //     menu.tieneOpciones = asignadas > 0;
  //     menu.todasAsignadas = asignadas === total;
  //   }
  // }
  async actualizarEstadoDelMenu(): Promise<void> {
    if (this.menuSeleccionado === null || this.perfilSeleccionado === null) return;

    const asignadasResp = await this.perfilesOpcionesService
      .getOpcionesPorPerfilYMenu(this.perfilSeleccionado, this.menuSeleccionado)
      .toPromise();
    const asignadas = asignadasResp?.data ?? [];

    const subResp = await this.subMenuService
      .getSubMenusPorMenu(this.menuSeleccionado)
      .toPromise();
    const subIds = (subResp?.data ?? [])
      .filter(sm => sm.status === true)
      .map(sm => sm.id_sub);

    let todas: OpcionResponse[] = [];
    if (subIds.length > 0) {
      const todasResp = await Promise.all(
        subIds.map(idSub => this.opcionesService.getOpcionesPorSubMenu(idSub).toPromise())
      );
      todas = todasResp.flatMap(r => (r?.data ?? []).filter(o => o.status === true));
    }

    const menu = this.menus.find(m => m.id_menu === this.menuSeleccionado);
    if (menu) {
      menu.tieneOpciones = asignadas.length > 0;
      menu.todasAsignadas = (todas.length > 0) && (asignadas.length === todas.length);
    }
  }

  esModuloCompletamenteAsignado(moduloId: number): boolean {
    const modulo = this.modulos.find(m => m.id_modulo === moduloId) as any;
    return modulo?.todasAsignadas ?? false;
  }

  obtenerEstadoCheckBox(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  detenerYAplicarCambioModulo(event: Event, moduloId: number): void {
    event.stopPropagation();
    const marcar = (event.target as HTMLInputElement).checked;

    if (this.perfilSeleccionado === null) return;

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: moduloId,
      status: marcar,
      nivel: 'modulo'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: async () => {
        // AGREGAR: Recargar cache como los otros métodos
        const sistema = this.sistemas.find(s => s.nombre === this.sistemaActivo);
        if (sistema) {
          await this.cargarEstadosCompletos(sistema.id_sistema);
        }

        this.seleccionarModulo(moduloId);
      },
      error: (err) => console.error('Error en cambio masivo de módulo:', err)
    });
  }

  cargarPerfiles(): void {
    this.perfilesService.getPerfiles().subscribe(response => {
      this.perfiles = response.data.filter(p => p.estado === true);
    });
  }

  crearEntidad(tipo: 'sistema' | 'modulo' | 'menu' | 'submenu' | 'opcion'): void {
    let idRelacionado: number | null = null;

    if (tipo === 'modulo') {
      const sistema = this.sistemas.find(s => s.nombre === this.sistemaActivo);
      idRelacionado = sistema?.id_sistema ?? null;
      if (!idRelacionado) return alert('❌ No hay sistema activo seleccionado.');
    }

    if (tipo === 'menu') {
      if (!this.moduloSeleccionado) return alert('❌ Selecciona un módulo primero.');
      idRelacionado = this.moduloSeleccionado;
    }

    if (tipo === 'submenu') {
      if (!this.menuSeleccionado) return alert('❌ Selecciona un menú primero.');
      idRelacionado = this.menuSeleccionado;
    }

    if (tipo === 'opcion') {
      if (!this.submenuSeleccionado) return alert('❌ Selecciona un submenú primero.');
      idRelacionado = this.submenuSeleccionado;
    }
    // Para otros tipos (sistema, modulo, menu, submenu)
    const dialogRef = this.dialog.open(PerfilesFormComponent, {
      width: '400px',
      data: {
        tipo,
        idRelacionado
      }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado === true) {
        this.recargarEntidad(tipo);
      }
    });
  }


  editarGeneral(tipo: 'sistema' | 'modulo' | 'menu' | 'submenu' | 'opcion', id: number): void {
    const dialogRef = this.dialog.open(PerfilesFormComponent, {
      width: '400px',
      data: { tipo, id }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.recargarEntidad(tipo);
      }
    });
  }

  eliminarGeneral(tipo: 'sistema' | 'modulo' | 'menu' | 'submenu' | 'opcion', id: number): void {
    const data: MessageBoxData = {
      title: `¿Eliminar ${tipo}?`,
      message: `¿Estás seguro de que deseas eliminar este ${tipo}?`,
      type: 'warning',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      showCancel: true
    };

    this.dialog.open(CustomMessageBoxComponent, {
      width: '400px',
      data
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      // Lógica de eliminación condicional basada en tipo
      let servicio;
      switch (tipo) {
        case 'sistema': servicio = this.sistemaService; break;
        case 'modulo': servicio = this.moduloService; break;
        case 'menu': servicio = this.menuService; break;
        case 'submenu': servicio = this.subMenuService; break;
        case 'opcion': servicio = this.opcionesService; break;
      }

      servicio.softDelete(id).subscribe({
        next: (resp) => {
          if (resp.data === true) {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'Eliminado',
                message: `El ${tipo} fue eliminado correctamente.`,
                type: 'success',
                confirmText: 'Aceptar',
                showCancel: false
              }
            });
            this.recalcularEstadosVisuales(tipo, id);
            this.recargarEntidad(tipo);
          } else {
            this.dialog.open(CustomMessageBoxComponent, {
              width: '400px',
              data: {
                title: 'No se puede eliminar',
                message: `No se puede eliminar el ${tipo} porque está en uso.`,
                type: 'info',
                confirmText: 'Aceptar',
                showCancel: false
              }
            });
          }
        },
        error: (err) => {
          console.error(`❌ Error al eliminar ${tipo}:`, err);
        }
      });
    });
  }

  recargarEntidad(tipo: string): void {
    switch (tipo) {
      case 'sistema':
        this.sistemaService.getSistemas().subscribe(r => this.sistemas = r.data.filter(s => s.status === true));
        break;
      case 'modulo':
        const sistema = this.sistemas.find(s => s.nombre === this.sistemaActivo);
        if (sistema) {
          this.moduloService.getModulosPorSistema(sistema.id_sistema).subscribe(resp => {
            this.modulos = resp.data.filter(m => m.status === true).map(modulo => ({
              ...modulo,
              tieneOpciones: false,
              todasAsignadas: false
            }));
          });
        }
        break;
      case 'menu':
        if (this.moduloSeleccionado) this.seleccionarModulo(this.moduloSeleccionado);
        break;
      case 'submenu':
        if (this.moduloSeleccionado) this.seleccionarModulo(this.moduloSeleccionado);
        break;
      case 'opcion':
        if (this.submenuSeleccionado) this.seleccionarSubMenu(this.submenuSeleccionado);
        break;
    }
  }

  abrirMenuAcciones(sistema: SistemaResponse): void {
    this.sistemaAccionesVisible = (this.sistemaAccionesVisible === sistema) ? null : sistema;
  }

}
