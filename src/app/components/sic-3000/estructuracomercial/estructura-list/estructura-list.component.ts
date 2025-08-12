import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { EstructuraFormComponent } from '../estructura-form/estructura-form.component';

import { EstructuraComercialService } from 'src/app/services/estructura-comercial.service'
import { DivisionService } from 'src/app/services/division.service'
import { SubdivisionService } from 'src/app/services/subdivision.service'
import { DepartamentoService } from 'src/app/services/departamento.service'
import { SeccionService } from 'src/app/services/seccion.service'
import { GrupoService } from 'src/app/services/grupo.service'
import { ProductoService } from 'src/app/services/productos.service'
import { UsuarioService } from 'src/app/services/usuario.service';

import { ProductoEstructuraComercialRequest } from 'src/app/interfaces/requests/producto-estructura-request';
import { ProductoResponse } from 'src/app/interfaces/responses/producto-response'

@HostListener('document:click')

@Component({
  selector: 'app-estructura-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estructura-list.component.html',
  styleUrl: './estructura-list.component.css'
})
export class EstructuraListComponent {
  opcionSeleccionada: any = null;
  modulos: any[] = [];

  productos: ProductoResponse[] = [];
  productosFiltrados = this.productos;

  menuContextualVisible = false;
  posicionMenu = { x: 0, y: 0 };
  nodoSeleccionado: any = null;
  empresas: any[] = [];
  usuarioActual = this.usuarioService.getUsuarioActual();

  constructor(
    private estructuraService: EstructuraComercialService,
    private divisionService: DivisionService,
    private subdivisionService: SubdivisionService,
    private departamentoService: DepartamentoService,
    private seccionService: SeccionService,
    private grupoService: GrupoService,
    private productoService: ProductoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarEstructurasRaiz();
  }

  cargarEstructuraComercial(): void {
    this.estructuraService.getByFk(this.usuarioActual?.id_empresa ?? 1).subscribe(res => {
      if (res.data) {
        this.modulos = res.data.map(ec => ({
          id: ec.idEstructuraComercial,
          nombre: ec.descri,
          tipo: 'estructura',
          expandido: false,
          hijos: []
        }));
      }
    });
  }

  /**
 * Expande/cierra carpetas o selecciona hojas.
 */

  toggleExpand(nodo: any): void {
    if (nodo.expandido) {
      nodo.expandido = false;
      return;
    }

    switch (nodo.tipo) {
      case 'empresa':
        this.estructuraService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(ec => ({
            id: ec.idEstructuraComercial,
            nombre: ec.descri,
            tipo: 'estructura',
            numnodos: ec.numnodos,
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        });
        break;

      case 'estructura':
        if (this.getNivelPorTipo('estructura') >= nodo.numnodos) return;
        this.divisionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(d => ({
            id: d.idDivision,
            nombre: d.descripcion,
            tipo: 'division',
            numnodos: nodo.numnodos,
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        });
        break;

      case 'division':
        if (this.getNivelPorTipo('division') >= nodo.numnodos) return;
        this.subdivisionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(s => ({
            id: s.idSubDivision,
            nombre: s.descripcion,
            tipo: 'subdivision',
            numnodos: nodo.numnodos,
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        });
        break;

      case 'subdivision':
        if (this.getNivelPorTipo('subdivision') >= nodo.numnodos) return;
        this.departamentoService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(d => ({
            id: d.idDepartamento,
            nombre: d.descripcion,
            tipo: 'departamento',
            numnodos: nodo.numnodos,
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        });
        break;

      case 'departamento':
        if (this.getNivelPorTipo('departamento') >= nodo.numnodos) return;
        this.seccionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(s => ({
            id: s.idSeccion,
            nombre: s.descripcion,
            tipo: 'seccion',
            numnodos: nodo.numnodos,
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        });
        break;

      case 'seccion':
        if (this.getNivelPorTipo('seccion') >= nodo.numnodos) return;
        this.grupoService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = res.data.map(g => ({
            id: g.idGrupo,
            nombre: g.descripcion,
            tipo: 'grupo'
          }));
          nodo.expandido = true;
        });
        break;
    }
  }

  onNodoClick(nodo: any) {
    this.toggleExpand(nodo);

    const req: ProductoEstructuraComercialRequest = {};
    switch (nodo.tipo) {
      case 'division': req.iddivision = nodo.id; break;
      case 'subdivision': req.idsubdivision = nodo.id; break;
      case 'departamento': req.iddepartamento = nodo.id; break;
      case 'seccion': req.idseccion = nodo.id; break;
      case 'grupo': req.idgrupo = nodo.id; break;
      // Si tu API acepta empresa/estructura, añade los campos al request e inclúyelos aquí
      default: return; // sin filtro válido, no llamar
    }

    this.productoService.getByEstructura(req).subscribe({
      next: (res) => {
        this.productos = res.data ?? [];
        this.productosFiltrados = this.productos; // si usas filtrado aparte
      },
      error: (err) => console.error(err)
    });
  }

  cargarEstructurasRaiz(): void {
    this.estructuraService.getByFk(this.usuarioActual?.id_empresa ?? 1).subscribe(res => {
      this.empresas = res.data.map(ec => ({
        id: ec.idEstructuraComercial,
        nombre: ec.descri,
        tipo: 'estructura',
        numnodos: ec.numnodos,
        expandido: false,
        hijos: []
      }));
    });
  }


  abrirMenuContextual(event: MouseEvent, nodo: any): void {
    event.preventDefault();
    this.menuContextualVisible = true;
    this.posicionMenu = { x: event.clientX, y: event.clientY };
    this.nodoSeleccionado = nodo;
  }

  cerrarMenuContextual(): void {
    this.menuContextualVisible = false;
  }

  crearElemento(): void {
    this.menuContextualVisible = false;

    if (!this.nodoSeleccionado) return;

    const tipo = this.nodoSeleccionado.tipo;
    // const idPadre = tipo === 'estructura' ? 1 : this.nodoSeleccionado.id;

    const siguienteNivel = this.obtenerTipoHijo(tipo);
    const idPadre = this.nodoSeleccionado.id;
    if (!siguienteNivel) return;

    const dialogRef = this.dialog.open(EstructuraFormComponent, {
      width: '400px',
      data: {
        tipo: siguienteNivel,
        idPadre: idPadre
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.toggleExpand(this.nodoSeleccionado);
      }
    });

  }

  obtenerTipoHijo(tipoActual: string): string | null {
    switch (tipoActual) {
      case 'empresa': return 'estructuraComercial';
      case 'estructura': return 'division';
      case 'division': return 'subDivision';
      case 'subdivision': return 'departamento';
      case 'departamento': return 'seccion';
      case 'seccion': return 'grupo';
      default: return null;
    }
  }


  editarElemento(): void {
    this.menuContextualVisible = false;

    if (!this.nodoSeleccionado) return;

    const dialogRef = this.dialog.open(EstructuraFormComponent, {
      width: '400px',
      data: {
        tipo: this.nodoSeleccionado.tipo,
        id: this.nodoSeleccionado.id,
        nombre: this.nodoSeleccionado.nombre,
      }
    });

    dialogRef.afterClosed().subscribe((resultado: { nuevoNombre?: string } | boolean | undefined) => {
      if (resultado && typeof resultado === 'object' && resultado.nuevoNombre) {
        this.nodoSeleccionado.nombre = resultado.nuevoNombre;
      }
    });
  }

  getNivelPorTipo(tipo: string): number {
    switch (tipo) {
      case 'estructura': return 1;
      case 'division': return 2;
      case 'subdivision': return 3;
      case 'departamento': return 4;
      case 'seccion': return 5;
      case 'grupo': return 6;
      default: return 0;
    }
  }

  puedeExpandirse(nodo: any): boolean {
    return this.getNivelPorTipo(nodo.tipo) < nodo.numnodos;
  }

  getIcono(nodo: any): string {
    if (!this.puedeExpandirse(nodo)) return '📄'; // hoja fija
    return nodo.expandido ? '📂' : '📁'; // carpeta abierta o cerrada
  }

  puedeCrear(nodo: any): boolean {
    if (!nodo || nodo.numnodos === undefined) return false;
    return this.getNivelPorTipo(nodo.tipo) < nodo.numnodos;
  }

  toggleExpandConRecarga(nodo: any): void {
    nodo.hijos = [];
    nodo.expandido = false;
    setTimeout(() => this.toggleExpand(nodo), 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Evita cerrar si el clic fue dentro del menú contextual
    if (!target.closest('.context-menu')) {
      this.menuContextualVisible = false;
    }
  }




}
