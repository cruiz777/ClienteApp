import { Component, OnInit } from '@angular/core';
import { PerfilesService } from 'src/app/services/perfil.service';
import { SistemaService } from 'src/app/services/sistema.service';
import { ModuloService } from 'src/app/services/modulo.service';
import { MenuService } from 'src/app/services/menu.service';
import { OpcionService } from 'src/app/services/opcion.service';
import { PerfilOpcionService } from 'src/app/services/perfilOpcion.service';

import { PerfilResponse } from 'src/app/interfaces/responses/perfil-response';
import { SistemaResponse } from 'src/app/interfaces/responses/sistema-response';
import { ModuloResponse } from 'src/app/interfaces/responses/modulo-response';
import { MenuResponse } from 'src/app/interfaces/responses/menu-response';
import { OpcionResponse } from 'src/app/interfaces/responses/opcion-response';

import { PerfilOpcion } from 'src/app/interfaces/requests/perfil-opcion-request';
import { CreateBulkPerfilOption } from 'src/app/interfaces/requests/create-bulk-perfil-options-request';

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
  perfiles: PerfilResponse[] = [];
  sistemas: SistemaResponse[] = [];
  modulos: ModuloResponse[] = [];
  menus: MenuExtendido[] = [];
  opcionnes: OpcionResponse[] = [];

  perfilSeleccionado: number | null = null;
  moduloSeleccionado: number | null = null;
  menuSeleccionado: number | null = null;
  sistemaActivo: string = '';

  opcionesAsignadas: number[] = [];

  constructor(
    private perfilesService: PerfilesService,
    private sistemaService: SistemaService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionesService: OpcionService,
    private perfilesOpcionesService: PerfilOpcionService
  ) {}

  ngOnInit(): void {
    this.perfilesService.getPerfiles().subscribe(response => {
      this.perfiles = response.data;
    });

    this.sistemaService.getSistemas().subscribe(response => {
      this.sistemas = response.data;
      if (this.sistemas.length > 0) {
        const sistema = this.sistemas[0];
        this.sistemaActivo = sistema.nombre;
        this.moduloService.getModulosPorSistema(sistema.id_sistema).subscribe(resp => {
          this.modulos = resp.data;
        });
      }
    });
  }

  seleccionarSistema(nombre: string, idSistema: number): void {
    this.sistemaActivo = nombre;
    this.menus = [];
    this.opcionnes = [];
    this.moduloService.getModulosPorSistema(idSistema).subscribe(resp => {
      this.modulos = resp.data;
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
      const menusOriginales = response.data;
      const menuesExtendidos: MenuExtendido[] = menusOriginales.map(menu => ({
        ...menu,
        tieneOpciones: false,
        todasAsignadas: false
      }));

      if (this.perfilSeleccionado === null) {
        this.menus = menuesExtendidos;
        return;
      }

      const solicitudes = menuesExtendidos.map(menu =>
        Promise.all([
          this.perfilesOpcionesService.getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, menu.id_menu).toPromise(),
          this.opcionesService.getOpcionesPorMenu(menu.id_menu).toPromise()
        ]).then(([asignadasResp, todasResp]) => {
          const asignadas = asignadasResp?.data ?? [];
          const todas = todasResp?.data ?? [];
          menu.tieneOpciones = asignadas.length > 0;
          menu.todasAsignadas = todas.length > 0 && asignadas.length === todas.length;
        })
      );

      Promise.all(solicitudes).then(() => {
        this.menus = menuesExtendidos;
      });
    });
  }

  seleccionarMenu(idMenu: number): void {
    this.menuSeleccionado = idMenu;
    if (this.perfilSeleccionado === null) return;

    this.opcionesService.getOpcionesPorMenu(idMenu).subscribe(opcionesResp => {
      const todasLasOpciones = opcionesResp.data;

      this.perfilesOpcionesService.getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, idMenu).subscribe(asignadasResp => {
        const asignadasIds = asignadasResp.data.map(op => op.id_opcion);
        this.opcionesAsignadas = asignadasIds;

        this.opcionnes = todasLasOpciones.map(op => ({
          ...op,
          status: asignadasIds.includes(op.id_opcion)
        }));

        this.actualizarEstadoDelMenu();
      });
    });
  }

  onToggleOpcion(opcion: OpcionResponse): void {
    if (this.perfilSeleccionado === null) return;

    const request: PerfilOpcion = {
      id_perfil: this.perfilSeleccionado,
      id_opcion: opcion.id_opcion,
      status: opcion.status
    };

    this.perfilesOpcionesService.actualizarOpcion(request).subscribe({
      next: () => this.actualizarEstadoDelMenu(),
      error: (err) => console.error('❌ Error al actualizar la opción:', err)
    });
  }

  actualizarEstadoDelMenu(): void {
    if (this.menuSeleccionado === null) return;

    const total = this.opcionnes.length;
    const asignadas = this.opcionnes.filter(op => op.status).length;

    const menu = this.menus.find(m => m.id_menu === this.menuSeleccionado);
    if (menu) {
      menu.tieneOpciones = asignadas > 0;
      menu.todasAsignadas = asignadas === total;
    }
  }

  onToggleTodoOpciones(menu: MenuExtendido): void {
    if (this.perfilSeleccionado === null) return;

    const marcar = !menu.todasAsignadas;
    const accion = marcar ? 'Asignar' : 'Quitar';

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: menu.id_menu,
      status: marcar,
      nivel: 'menu'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: () => {
        this.opcionnes = [];
        this.seleccionarMenu(menu.id_menu);
      },
      error: (err) => console.error(`❌ Error al ${accion.toLowerCase()} opciones del menú:`, err)
    });
  }

  onToggleTodoOpcionesModulo(moduloId: number, marcar: boolean): void {
    if (this.perfilSeleccionado === null) return;

    const accion = marcar ? 'Asignar' : 'Quitar';

    const request: CreateBulkPerfilOption = {
      id_perfil: this.perfilSeleccionado,
      id: moduloId,
      status: marcar,
      nivel: 'modulo'
    };

    this.perfilesOpcionesService.CreateBulkPerfilOptions(request).subscribe({
      next: () => this.seleccionarModulo(moduloId),
      error: (err) => console.error(`❌ Error al ${accion.toLowerCase()} opciones del módulo:`, err)
    });
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
}
