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

interface MenuExtendido extends MenuResponse {
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
  modulos: ModuloResponse[] = [];
  menus: MenuExtendido[] = [];
  opcionnes: OpcionResponse[] = [];
  submenus: SubMenuResponse[] = [];

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

  // ==================== Constructor ====================
  constructor(
    private perfilesService: PerfilesService,
    private sistemaService: SistemaService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionesService: OpcionService,
    private dialog: MatDialog,
    private perfilesOpcionesService: PerfilOpcionService,
    private subMenuService: SubMenuService
  ) { }

  // ==================== Inicialización ====================
  ngOnInit(): void {
    this.cargarPerfiles();

    this.sistemaService.getSistemas().subscribe(response => {
      this.sistemas = response.data.filter(s => s.status === true);
      if (this.sistemas.length > 0) {
        const sistema = this.sistemas[0];
        this.sistemaActivo = sistema.nombre;
        this.moduloService.getModulosPorSistema(sistema.id_sistema).subscribe(resp => {
          this.modulos = resp.data.filter(m => m.status === true);
        });
      }
    });
  }

  // ==================== Métodos de selección ====================
  seleccionarSistema(nombre: string, idSistema: number): void {
    this.sistemaActivo = nombre;
    this.menus = [];
    this.opcionnes = [];
    this.moduloService.getModulosPorSistema(idSistema).subscribe(resp => {
      this.modulos = resp.data.filter(m => m.status === true);
    });
  }

  seleccionarPerfil(idPerfil: number): void {
    this.perfilSeleccionado = idPerfil;
    this.menus = [];
    this.opcionnes = [];
  }

  seleccionarModulo(idModulo: number): void {
    this.moduloSeleccionado = idModulo;
    this.menuSeleccionado = null;
    this.opcionnes = [];

    this.menuService.getMenusPorModulo(idModulo).subscribe(response => {
      const menuesExtendidos: MenuExtendido[] = response.data
        .filter(m => m.status === true)
        .map(menu => ({
          ...menu,
          tieneOpciones: false,
          todasAsignadas: false
        }));

      if (this.perfilSeleccionado === null) {
        this.menus = menuesExtendidos;
        return;
      }

      // Para cada menú: (1) asignadas por MENÚ, (2) TODAS por MENÚ = sumatoria de submenús
      const solicitudes = menuesExtendidos.map(async (menu) => {
        // 1) Asignadas del perfil en este MENÚ
        const asignadasResp = await this.perfilesOpcionesService
          .getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, menu.id_menu)
          .toPromise();
        const asignadas = asignadasResp?.data ?? [];

        // 2) TODAS las opciones del MENÚ = submenús activos → opciones activas
        const subResp = await this.subMenuService
          .getSubMenusPorMenu(menu.id_menu)
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

        // 3) Flags para la UI
        menu.tieneOpciones  = asignadas.length > 0;
        menu.todasAsignadas = (todas.length > 0) && (asignadas.length === todas.length);
      });

      Promise.all(solicitudes).then(() => {
        this.menus = menuesExtendidos;
      });
    });
  }


  seleccionarMenu(idMenu: number): void {
    this.menuSeleccionado = idMenu;
    this.submenuSeleccionado = null;
    this.opcionnes = [];

    // Cargar submenus del menu seleccionado
    this.subMenuService.getSubMenusPorMenu(idMenu).subscribe(response => {
      this.submenus = response.data.filter(sm => sm.status === true);
    });
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
      next: () => {
        // Recargar opciones del submenu seleccionado
        if (this.submenuSeleccionado === subMenuId) {
          this.seleccionarSubMenu(subMenuId);
        }
      },
      error: (err) => console.error('❌ Error en cambio masivo de opciones de submenu:', err)
    });
  }

  esSubMenuCompletamenteAsignado(subMenuId: number): boolean {
    if (this.submenuSeleccionado !== subMenuId || this.opcionnes.length === 0) {
      console.log(`SubMenu ${subMenuId}: No seleccionado o sin opciones`);
      return false;
    }
    
    const resultado = this.opcionnes.every(op => op.status);
    console.log(`SubMenu ${subMenuId}: ${resultado ? 'Todas asignadas' : 'No todas asignadas'}`);
    return resultado;
  }

  // ==================== Acciones sobre opciones ====================
  onToggleOpcion(opcion: OpcionResponse): void {
    if (this.perfilSeleccionado === null) return;

    const request: PerfilOpcion = {
      id_perfil: this.perfilSeleccionado,
      id_opcion: opcion.id_opcion,
      status: opcion.status
    };

    this.perfilesOpcionesService.updateOpcionStatus(
      this.perfilSeleccionado!, 
      opcion.id_opcion, 
      opcion.status
    ).subscribe({
      next: () => this.actualizarEstadoDelMenu(),
      error: (err) => console.error('❌ Error al actualizar la opción:', err)
    });
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
      next: () => {
        menu.todasAsignadas = marcar;
        menu.tieneOpciones = marcar;
        if (this.menuSeleccionado === menu.id_menu) {
          this.opcionnes = [];
          this.seleccionarMenu(menu.id_menu);
        }
      },
      error: (err) => console.error('❌ Error en cambio masivo de opciones de menú:', err)
    });
  }

  onToggleTodoOpcionesModulo(moduloId: number, marcar: boolean): void {
    if (this.perfilSeleccionado === null) return;

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado ,
      id: moduloId,
      status: marcar,
      nivel: 'modulo'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: () => this.seleccionarModulo(moduloId),
      error: (err) => console.error('❌ Error en cambio masivo de opciones de módulo:', err)
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
      menu.tieneOpciones  = asignadas.length > 0;
      menu.todasAsignadas = (todas.length > 0) && (asignadas.length === todas.length);
    }
  }

  esModuloCompletamenteAsignado(moduloId: number): boolean {
    const menusDelModulo = this.menus.filter(m => m.id_modulo === moduloId);
    return menusDelModulo.length > 0 && menusDelModulo.every(m => m.todasAsignadas);
  }

  obtenerEstadoCheckBox(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  detenerYAplicarCambioModulo(event: Event, moduloId: number): void {
    event.stopPropagation();
    const marcar = (event.target as HTMLInputElement).checked;
    this.onToggleTodoOpcionesModulo(moduloId, marcar);
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
            this.modulos = resp.data.filter(m => m.status === true);
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
