import { Routes, Router } from '@angular/router';
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ⬅️ NUEVO

import { MatDialog } from '@angular/material/dialog';
import { EstructuraFormComponent } from '../estructura-form/estructura-form.component';

import { EstructuraComercialService } from 'src/app/services/estructura-comercial.service';
import { DivisionService } from 'src/app/services/division.service';
import { SubdivisionService } from 'src/app/services/subdivision.service';
import { DepartamentoService } from 'src/app/services/departamento.service';
import { SeccionService } from 'src/app/services/seccion.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { ProductoService } from 'src/app/services/productos.service';
import { UsuarioService } from 'src/app/services/usuario.service';

import { ProductoEstructuraComercialRequest } from 'src/app/interfaces/requests/producto-estructura-request';
import { ProductoResponse } from 'src/app/interfaces/responses/producto-response';

import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@HostListener('document:click')
@Component({
  selector: 'app-estructura-list',
  standalone: true,
  imports: [CommonModule, FormsModule], // ⬅️ FormsModule para [(ngModel)]
  templateUrl: './estructura-list.component.html',
  styleUrl: './estructura-list.component.css'
})
export class EstructuraListComponent {
  // --------- Estado de árbol / UI ---------
  opcionSeleccionada: any = null;
  modulos: any[] = [];
  menuContextualVisible = false;
  posicionMenu = { x: 0, y: 0 };
  nodoSeleccionado: any = null;

  // RAÍZ que hoy son estructuras (se mantiene la variable por compatibilidad con HTML)
  empresas: any[] = [];

  // Usuario actual
  usuarioActual = this.usuarioService.getUsuarioActual();

  // --------- Tabla dinámica ---------
  tableMode: 'productos' | 'intermedio' = 'productos';
  tableColumns: Array<{ key: string; label: string }> = [];
  tableRows: any[] = [];

  // Base de datos sin filtrar (para no perder el dataset original)
  private tableRowsAll: any[] = [];

  // Filtros por columna (key -> valor)
  columnFilters: Record<string, string> = {};
  private filterChanges$ = new Subject<void>();

  // --------- Compatibilidad existente ---------
  productos: ProductoResponse[] = [];
  productosFiltrados = this.productos;

  constructor(
    private estructuraService: EstructuraComercialService,
    private divisionService: DivisionService,
    private subdivisionService: SubdivisionService,
    private departamentoService: DepartamentoService,
    private seccionService: SeccionService,
    private grupoService: GrupoService,
    private productoService: ProductoService,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    this.cargarEstructurasRaiz();

    // Cabecera inicial vacía de productos
    this.prepareTableForProducts([]);

    // Suscripción para aplicar filtros con debounce
    this.filterChanges$
      .pipe(debounceTime(200))
      .subscribe(() => this.applyFilters());
  }

  // ===================== NIVELES/ÁRBOL (igual que ya tienes) =====================
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
    if (!this.puedeExpandirse(nodo)) return '📄';
    return nodo.expandido ? '📂' : '📁';
  }
  puedeCrear(nodo: any): boolean {
    if (!nodo || nodo.numnodos === undefined) return false;
    return this.getNivelPorTipo(nodo.tipo) < nodo.numnodos;
  }

  cargarEstructurasRaiz(): void {
    this.estructuraService.getByFk(this.usuarioActual?.id_empresa ?? 1).subscribe(res => {
      this.empresas = (res.data ?? []).map((ec: any) => ({
        id: ec.idEstructuraComercial,
        nombre: ec.descri,
        tipo: 'estructura',
        numnodos: ec.numnodos,
        expandido: false,
        hijos: []
      }));
    });
  }

  toggleExpand(nodo: any): void {
    if (nodo.expandido) { nodo.expandido = false; return; }
    switch (nodo.tipo) {
      case 'empresa':
        this.estructuraService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((ec: any) => ({
            id: ec.idEstructuraComercial, nombre: ec.descri, tipo: 'estructura',
            numnodos: ec.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
      case 'estructura':
        if (!this.puedeExpandirse(nodo)) return;
        this.divisionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((d: any) => ({
            id: d.idDivision, nombre: d.descripcion, tipo: 'division',
            numnodos: nodo.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
      case 'division':
        if (!this.puedeExpandirse(nodo)) return;
        this.subdivisionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((s: any) => ({
            id: s.idSubDivision, nombre: s.descripcion, tipo: 'subdivision',
            numnodos: nodo.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
      case 'subdivision':
        if (!this.puedeExpandirse(nodo)) return;
        this.departamentoService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((d: any) => ({
            id: d.idDepartamento, nombre: d.descripcion, tipo: 'departamento',
            numnodos: nodo.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
      case 'departamento':
        if (!this.puedeExpandirse(nodo)) return;
        this.seccionService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((s: any) => ({
            id: s.idSeccion, nombre: s.descripcion, tipo: 'seccion',
            numnodos: nodo.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
      case 'seccion':
        if (!this.puedeExpandirse(nodo)) return;
        this.grupoService.getByFk(nodo.id).subscribe(res => {
          nodo.hijos = (res.data ?? []).map((g: any) => ({
            id: g.idGrupo, nombre: g.descripcion, tipo: 'grupo',
            numnodos: nodo.numnodos, expandido: false, hijos: []
          }));
          nodo.expandido = true;
        });
        break;
    }
  }

  onNodoClick(nodo: any): void {
    this.toggleExpand(nodo);
    const esHoja = !this.puedeExpandirse(nodo);
    if (esHoja) {
      this.loadProductsForNode(nodo);
    } else {
      this.loadIntermediateDataForNode(nodo);
    }
  }

  esUltimoNivel(nodo: any): boolean {
    if (!nodo) return false;
    return !this.puedeExpandirse(nodo);
  }

  // ===================== DATA: Productos =====================
  private loadProductsForNode(nodo: any): void {
    const req: ProductoEstructuraComercialRequest = {};
    switch (nodo.tipo) {
      case 'estructura': (req as any).idestructuracomercial = nodo.id; break;
      case 'division': req.iddivision = nodo.id; break;
      case 'subdivision': req.idsubdivision = nodo.id; break;
      case 'departamento': req.iddepartamento = nodo.id; break;
      case 'seccion': req.idseccion = nodo.id; break;
      case 'grupo': req.idgrupo = nodo.id; break;
      default: return;
    }

    this.productoService.getByEstructura(req).subscribe({
      next: (res) => {
        this.productos = res.data ?? [];
        this.productosFiltrados = this.productos;
        this.prepareTableForProducts(this.productos);
      },
      error: (err) => console.error(err)
    });
  }

  // ===================== DATA: Intermedio (hijos del nodo) =====================
  private loadIntermediateDataForNode(nodo: any): void {
    const tipo = nodo?.tipo as string;
    if (!tipo) return;

    const toUniformRows = (items: any[], idKey: string, nivelHijo: string) => {
      return (items ?? []).map(it => ({
        id_hijo: it[idKey],
        nivel_hijo: nivelHijo,
        nombre_hijo: it.descripcion ?? it.descri ?? it.nombre ?? ''
      }));
    };

    switch (tipo) {
      case 'estructura':
        this.divisionService.getByFk(nodo.id).subscribe(res => {
          this.prepareTableForIntermediateChildren(toUniformRows(res.data, 'idDivision', 'division'));
        });
        break;
      case 'division':
        this.subdivisionService.getByFk(nodo.id).subscribe(res => {
          this.prepareTableForIntermediateChildren(toUniformRows(res.data, 'idSubDivision', 'subdivision'));
        });
        break;
      case 'subdivision':
        this.departamentoService.getByFk(nodo.id).subscribe(res => {
          this.prepareTableForIntermediateChildren(toUniformRows(res.data, 'idDepartamento', 'departamento'));
        });
        break;
      case 'departamento':
        this.seccionService.getByFk(nodo.id).subscribe(res => {
          this.prepareTableForIntermediateChildren(toUniformRows(res.data, 'idSeccion', 'seccion'));
        });
        break;
      case 'seccion':
        this.grupoService.getByFk(nodo.id).subscribe(res => {
          this.prepareTableForIntermediateChildren(toUniformRows(res.data, 'idGrupo', 'grupo'));
        });
        break;
    }
  }

  // ===================== Presentación (set columnas + datos) =====================
  private setTable(columns: Array<{ key: string; label: string }>, rows: any[]): void {
    this.tableColumns = columns ?? [];
    this.tableRowsAll = rows ?? [];
    this.resetFiltersForCurrentColumns();
    this.applyFilters(); // mostrará todo si no hay filtros
  }

  private prepareTableForProducts(productos: ProductoResponse[]): void {
    this.tableMode = 'productos';
    this.setTable(
      [
        { key: 'id_producto', label: 'Id' },
        { key: 'codpro', label: 'Cod. Pro' },
        { key: 'despro', label: 'Descripción' },
        { key: 'tippro', label: 'Tip. Prod' },
        { key: 'codbar', label: 'Codbar.' }
      ],
      productos ?? []
    );
  }

  private prepareTableForIntermediateChildren(rows: any[]): void {
    this.tableMode = 'intermedio';
    this.setTable(
      [
        { key: 'id_hijo', label: 'Id Hijo' },
        { key: 'nombre_hijo', label: 'Nombre Hijo' }
      ],
      rows ?? []
    );
  }

  // ===================== Filtros por columna =====================
  private resetFiltersForCurrentColumns(): void {
    this.columnFilters = {};
    for (const c of this.tableColumns) this.columnFilters[c.key] = '';
  }

  onFilterInput(colKey: string, _value: string): void {
    // ya está en two-way binding con [(ngModel)], solo disparamos el debounce
    this.filterChanges$.next();
  }

  private applyFilters(): void {
    const filters = this.columnFilters;
    const hasAny = Object.values(filters).some(v => !!v?.trim());

    if (!hasAny) {
      this.tableRows = [...this.tableRowsAll];
      return;
    }

    const norm = (v: any) => this.normalizeText(String(v ?? ''));

    this.tableRows = this.tableRowsAll.filter(row => {
      for (const col of this.tableColumns) {
        const f = filters[col.key]?.trim();
        if (!f) continue;
        const cell = norm(row[col.key]);
        if (!cell.includes(norm(f))) return false;
      }
      return true;
    });
  }

  private normalizeText(t: string): string {
    return t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // quita acentos
  }

  // ===================== Menú contextual / utilidades (igual) =====================
  abrirMenuContextual(event: MouseEvent, nodo: any): void {
    event.preventDefault();
    this.menuContextualVisible = true;
    this.posicionMenu = { x: event.clientX, y: event.clientY };
    this.nodoSeleccionado = nodo;
  }
  cerrarMenuContextual(): void { this.menuContextualVisible = false; }

  crearElemento(): void {
    this.menuContextualVisible = false;
    if (!this.nodoSeleccionado) return;
    const tipo = this.nodoSeleccionado.tipo;
    const siguienteNivel = this.obtenerTipoHijo(tipo);
    const idPadre = this.nodoSeleccionado.id;
    if (!siguienteNivel) return;

    const dialogRef = this.dialog.open(EstructuraFormComponent, {
      width: '400px',
      data: { tipo: siguienteNivel, idPadre }
    });
    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) this.toggleExpand(this.nodoSeleccionado);
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
  crearProducto(): void {
    this.menuContextualVisible = false;
    if (!this.nodoSeleccionado) return;

    this.router.navigate(['sic-3000/productossic', this.nodoSeleccionado.id]);
  }


  toggleExpandConRecarga(nodo: any): void {
    nodo.hijos = [];
    nodo.expandido = false;
    setTimeout(() => this.toggleExpand(nodo), 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu')) this.menuContextualVisible = false;
  }
}
