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
import {PerfilOpcionService} from 'src/app/services/perfilOpcion.service';

/**
 * Componente encargado de mostrar pestañas con los sistemas y
 * debajo una tabla con todos los perfiles disponibles.
 */
@Component({
  selector: 'app-perfiles-list',
  templateUrl: './perfiles-list.component.html',
  styleUrls: ['./perfiles-list.component.css']
})

export class PerfilesListComponent implements OnInit {
  perfiles: PerfilResponse[] = [];
  sistemas: SistemaResponse[] = [];
  modulos: ModuloResponse[] = [];
  menus: MenuResponse[] = [];
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
    private perfilesOpcionesService:PerfilOpcionService
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
      console.log('Módulos cargados:', this.modulos);
    });
  }

  seleccionarPerfil(idPerfil: number): void {
    this.perfilSeleccionado = idPerfil;
    this.menus = [];
    this.opcionnes = [];
    console.log('Perfil seleccionado:', idPerfil);
  }

  seleccionarModulo(idModulo: number): void {
    this.moduloSeleccionado = idModulo;
    this.menuSeleccionado = null;

    this.menuService.getMenusPorModulo(idModulo).subscribe(response => {
      this.menus = response.data;
      this.opcionnes = [];
    });
  }

  seleccionarMenu(idMenu: number): void {
    this.menuSeleccionado = idMenu;

    if (this.perfilSeleccionado === null) return;

    // 1. Cargar todas las opciones del menú
    this.opcionesService.getOpcionesPorMenu(idMenu).subscribe(opcionesResponse => {
      const todasLasOpciones = opcionesResponse.data;

      // 2. Cargar las opciones asignadas al perfil
      this.perfilesOpcionesService.getOpcionesPorPerfilYMenu(this.perfilSeleccionado!, idMenu).subscribe(asignadasResponse => {
        this.opcionesAsignadas = asignadasResponse.data.map((op: any) => op.id_opcion);

        // 3. Marcar opciones
        this.opcionnes = todasLasOpciones.map((op: any) => ({
          ...op,
          status: this.opcionesAsignadas.includes(op.id_opcion)
        }));

        console.log('Opciones marcadas:', this.opcionnes);
      });
    });
  }


}
