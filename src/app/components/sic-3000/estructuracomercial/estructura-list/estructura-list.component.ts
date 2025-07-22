import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { EstructuraFormComponent } from '../estructura-form/estructura-form.component';

import { EstructuraComercialService } from 'src/app/services/estructura-comercial.service'
import { DivisionService } from 'src/app/services/division.service'
import { SubdivisionService } from 'src/app/services/subdivision.service'
import { DepartamentoService } from 'src/app/services/departamento.service'
import { SeccionService } from 'src/app/services/seccion.service'
import { GrupoService } from 'src/app/services/grupo.service'

@Component({
  selector: 'app-estructura-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estructura-list.component.html',
  styleUrl: './estructura-list.component.css'
})
export class EstructuraListComponent {
  opcionSeleccionada: any = null;
  // Datos jerárquicos (nivel 1 → nivel 3)
  modulos: any[] = [];

  // Lista completa de productos
  productos = [
    { codigo: 'P001', codigoBarras: '123456', descripcion: 'Resma Papel Bond A4', proveedor: 'IMPRESO S.A.', costo: 3.20, pvp: 5.00, abreviacion: 'PB-A4', referencia: 'PAP-BOND', existencia: 45, categoria: 'Papel Bond' },
    { codigo: 'P002', codigoBarras: '123457', descripcion: 'Cartón Corrugado 1.2mm', proveedor: 'Cartopel', costo: 1.50, pvp: 2.10, abreviacion: 'CC-1.2', referencia: 'CART-COR', existencia: 22, categoria: 'Cartón Corrugado' },
    { codigo: 'P003', codigoBarras: '123458', descripcion: 'Tinta Negra 500ml', proveedor: 'Quimicol', costo: 8.90, pvp: 11.50, abreviacion: 'TINT-N', referencia: 'TINTA-NG', existencia: 0, categoria: 'Tintas' },
    { codigo: 'P004', codigoBarras: '123459', descripcion: 'Pegamento Industrial', proveedor: '3M', costo: 6.00, pvp: 9.00, abreviacion: 'PEG-IND', referencia: 'PEG-3M', existencia: 12, categoria: 'Pegamentos' },
    { codigo: 'P005', codigoBarras: '123460', descripcion: 'Servicio Maquetación Editorial', proveedor: 'DiseñoYA', costo: 20.00, pvp: 30.00, abreviacion: 'MAQ-EDIT', referencia: 'SERV-DISE', existencia: 1, categoria: 'Maquetación' }
  ];
  // Productos filtrados que se muestran en la tabla
  productosFiltrados = this.productos;

  menuContextualVisible = false;
  posicionMenu = { x: 0, y: 0 };
  nodoSeleccionado: any = null;


  constructor(
    private estructuraService: EstructuraComercialService,
    private divisionService: DivisionService,
    private subdivisionService: SubdivisionService,
    private departamentoService: DepartamentoService,
    private seccionService: SeccionService,
    private grupoService: GrupoService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.cargarEstructuraComercial();
  }

  cargarEstructuraComercial(): void {
    const empresaId = 1;
    this.estructuraService.getByFk(empresaId).subscribe(res => {
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
    if (nodo.hijos && nodo.hijos.length > 0) {
      nodo.expandido = !nodo.expandido;
    } else if (nodo.tipo === 'estructura') {
      this.divisionService.getByFk(nodo.id).subscribe(res => {
        if (res.data) {
          nodo.hijos = res.data.map(d => ({
            id: d.idDivision,
            nombre: d.descripcion,
            tipo: 'division',
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        }
      });
    } else if (nodo.tipo === 'division') {
      this.subdivisionService.getByFk(nodo.id).subscribe(res => {
        if (res.data) {
          nodo.hijos = res.data.map(s => ({
            id: s.idSubDivision,
            nombre: s.descripcion,
            tipo: 'subdivision',
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        }
      });
    } else if (nodo.tipo === 'subdivision') {
      this.departamentoService.getByFk(nodo.id).subscribe(res => {
        if (res.data) {
          nodo.hijos = res.data.map(d => ({
            id: d.idDepartamento,
            nombre: d.descripcion,
            tipo: 'departamento',
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        }
      });
    } else if (nodo.tipo === 'departamento') {
      this.seccionService.getByFk(nodo.id).subscribe(res => {
        if (res.data) {
          nodo.hijos = res.data.map(s => ({
            id: s.idSeccion,
            nombre: s.descripcion,
            tipo: 'seccion',
            expandido: false,
            hijos: []
          }));
          nodo.expandido = true;
        }
      });
    } else if (nodo.tipo === 'seccion') {
      this.grupoService.getByFk(nodo.id).subscribe(res => {
        if (res.data) {
          nodo.hijos = res.data.map(g => ({
            id: g.idGrupo,
            nombre: g.descripcion,
            tipo: 'grupo'  // nivel final
          }));
          nodo.expandido = true;
        }
      });
    }
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
    const idPadre = tipo === 'estructura' ? 1 : this.nodoSeleccionado.id;

    const siguienteNivel = this.obtenerTipoHijo(tipo);
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
        this.toggleExpand(this.nodoSeleccionado); // recargar hijos
      }
    });
  }

  obtenerTipoHijo(tipoActual: string): string | null {
    switch (tipoActual) {
      case 'estructura': return 'division';
      case 'division': return 'subDivision';
      case 'subdivision': return 'departamento';
      case 'departamento': return 'seccion';
      case 'seccion': return 'grupo';
      default: return null;
    }
  }


}
