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
  opcionnes:OpcionResponse[]=[];

  sistemaActivo: string = '';

  constructor(
    private perfilesService: PerfilesService,
    private sistemaService: SistemaService,
    private moduloService: ModuloService,
    private menuService: MenuService,
    private opcionesService:OpcionService
  ) {}

  ngOnInit(): void {
    // Carga los perfiles
    this.perfilesService.getPerfiles().subscribe(response => {
      this.perfiles = response.data;
    });

    // Carga los sistemas y define el sistema activo por defecto
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

  /**
   * Marca un sistema como activo al hacer clic en su pestaña.
   * (Actualmente solo cambia visualmente; no filtra perfiles).
   */
  seleccionarSistema(nombre: string, idSistema: number): void {
    this.sistemaActivo = nombre;

    this.menus = [];// limpia los menus cuando se cambia de sistema
    this.opcionnes=[];//limpia las opciones cuando se cambia de sistema

    // 🔥 Llama al servicio para obtener los módulos por ID de sistema
    this.moduloService.getModulosPorSistema(idSistema).subscribe(response => {
      this.modulos = response.data;
      console.log('Módulos cargados:', this.modulos);
    });
  }

  seleccionarModulo(idModulo: number): void {
    this.menuService.getMenusPorModulo(idModulo).subscribe(response => {
      this.menus = response.data;
      this.opcionnes=[];//limpia las opciones cuando cambio de modulo
    });
  }

  seleccionarMenu(idMenu:number):void{
    this.opcionesService.getOpcionesPorMenu(idMenu).subscribe(respose=>{
      this.opcionnes=respose.data;
    })
  }


}
