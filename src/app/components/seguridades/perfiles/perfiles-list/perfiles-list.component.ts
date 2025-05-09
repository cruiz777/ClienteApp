import { Component, OnInit } from '@angular/core';
import { PerfilesService } from 'src/app/services/perfil.service';
import { SistemaService } from 'src/app/services/sistema.service';
import { PerfilResponse } from 'src/app/interfaces/responses/perfil-response';
import { SistemaResponse } from 'src/app/interfaces/responses/sistema-response';
import { ModuloService } from 'src/app/services/modulo.service';
import { ModuloResponse } from 'src/app/interfaces/responses/modulo-response';
import { MenuService } from 'src/app/services/menu.service';
import { MenuResponse } from 'src/app/interfaces/responses/menu-response';
import { OpcionService } from 'src/app/services/opcion.service';
import { OpcionResponse } from 'src/app/interfaces/responses/opcion-response';
import { PerfilOpcionService } from 'src/app/services/perfilOpcion.service';
import { PerfilOpcion } from 'src/app/interfaces/requests/perfil-opcion-request';

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
  opcionesAsignadas: number[] = [];

  perfilSeleccionado: number | null = null;
  moduloSeleccionado: number | null = null;
  menuSeleccionado: number | null = null;

  sistemaActivo: string = '';

  constructor(
    private perfilesService: PerfilesService,
    private sistemaService: SistemaService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionesService: OpcionService,
    private perfilesOpcionesService: PerfilOpcionService
  ) { }

  ngOnInit(): void {
    this.perfilesService.getPerfiles().subscribe(response => {
      this.perfiles = response.data;
    });

    this.sistemaService.getSistemas().subscribe(response => {
      this.sistemas = response.data;

      if (this.sistemas.length > 0) {
        const sistema = this.sistemas[0];
        this.sistemaActivo = sistema.nombre;

        this.moduloService.getModulosPorSistema(sistema.id_sistema).subscribe(response => {
          this.modulos = response.data;
        });
      }
    });
  }

  seleccionarSistema(nombre: string, idSistema: number): void {
    this.sistemaActivo = nombre;
    this.menus = [];
    this.opcionnes = [];

    this.moduloService.getModulosPorSistema(idSistema).subscribe(response => {
      this.modulos = response.data;
    });
  }

  seleccionarPerfil(idPerfil: number): void {
    this.perfilSeleccionado = idPerfil;
    this.menus = [];
    this.opcionnes = [];
  }

  /**
   * Carga los menús del módulo seleccionado y verifica si ya tienen opciones asignadas al perfil
   * para marcar visualmente el estado (color e icono)
   */
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

      // Evaluamos para cada menú si tiene opciones y si todas están asignadas
      const solicitudes = menuesExtendidos.map(menu =>
        Promise.all([
          this.perfilesOpcionesService.getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, menu.id_menu).toPromise(),
          this.opcionesService.getOpcionesPorMenu(menu.id_menu).toPromise()
        ]).then(([asignadasResponse, todasResponse]) => {
          const asignadas = asignadasResponse?.data ?? [];
          const todas = todasResponse?.data ?? [];

          menu.tieneOpciones = asignadas.length > 0;
          menu.todasAsignadas = todas.length > 0 && asignadas.length === todas.length;
        })
      );

      Promise.all(solicitudes).then(() => {
        this.menus = menuesExtendidos;
      });
    });
  }

  /**
   * Carga las opciones del menú y marca las que ya han sido asignadas al perfil
   */
  seleccionarMenu(idMenu: number): void {
    this.menuSeleccionado = idMenu;
    if (this.perfilSeleccionado === null) return;

    this.opcionesService.getOpcionesPorMenu(idMenu).subscribe(opcionesResponse => {
      const todasLasOpciones = opcionesResponse.data;

      this.perfilesOpcionesService.getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, idMenu).subscribe(asignadasResponse => {
        const opcionesAsignadasIds = asignadasResponse.data.map((op: any) => op.id_opcion);
        this.opcionesAsignadas = opcionesAsignadasIds;

        this.opcionnes = todasLasOpciones.map((op: any) => ({
          ...op,
          status: opcionesAsignadasIds.includes(op.id_opcion)
        }));

        this.actualizarEstadoDelMenu();
      });
    });
  }

  /**
   * Marca o desmarca una opción individual
   */
  onToggleOpcion(opcion: OpcionResponse): void {
    if (this.perfilSeleccionado === null) return;

    const request: PerfilOpcion = {
      id_perfil: this.perfilSeleccionado,
      id_opcion: opcion.id_opcion,
      status: opcion.status
    };

    this.perfilesOpcionesService.actualizarOpcion(request).subscribe({
      next: () => {
        console.log(`✔ Opción actualizada: ID ${request.id_opcion} - Estado: ${request.status}`);
        this.actualizarEstadoDelMenu();
      },
      error: (err) => {
        console.error('❌ Error al actualizar la opción:', err);
      }
    });
  }

  /**
   * Verifica si el menú tiene todas sus opciones marcadas o solo algunas
   */
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

  /**
   * Acción futura: Marcar o desmarcar todas las opciones del menú (en construcción)
   */
  onToggleTodoOpciones(menu: MenuExtendido): void {
    if (this.perfilSeleccionado === null) return;

    const marcar = !menu.todasAsignadas;
    console.log(`🔄 ${marcar ? 'Asignar' : 'Quitar'} todas las opciones del menú: ${menu.nombre}`);
    // Aquí se implementará el proceso de asignación masiva
  }
}
