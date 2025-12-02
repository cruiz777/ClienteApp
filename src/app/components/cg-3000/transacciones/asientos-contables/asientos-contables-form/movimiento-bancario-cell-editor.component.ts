import { Component, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

interface MovimientoCombo {
  id: number;
  movimiento: string;
  descripcion: string;
  label: string;   // "MOV - Descripción"
}

@Component({
  selector: 'app-movimiento-bancario-cell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mov-editor" [style.width.px]="columnWidth" >
      <input #input
             type="text"
             [(ngModel)]="search"
             (input)="onSearchChange()"
             (keydown.enter)="onEnter($event)"
             (keydown.arrowDown)="onArrowDown($event)"
             (keydown.arrowUp)="onArrowUp($event)" />

      <ul class="mov-list" *ngIf="filtered.length > 0">
        <li *ngFor="let m of filtered; let i = index"
            #itemRef
            [class.selected]="i === selectedIndex"
            (click)="onClickItem(i)">
          {{ m.label }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .mov-editor { position: relative; width: 100%; }
    input { width: 100%; box-sizing: border-box; padding: 2px 4px; }
    .mov-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 180px;
      overflow-y: auto;
      background: #edf3c9ff;
      border: 1px solid #ccc;
      z-index: 10;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 12px;
    }
    .mov-list li {
      padding: 2px 4px;
      cursor: pointer;
    }
    .mov-list li.selected {
      background: #1976d2;
      color: #fff;
    }
  `]
})
export class MovimientoBancarioCellEditorComponent implements ICellEditorAngularComp {

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @ViewChildren('itemRef') items!: QueryList<ElementRef<HTMLLIElement>>;

  private params!: ICellEditorParams & { movimientos?: MovimientoCombo[] };

  movimientos: MovimientoCombo[] = [];
  filtered: MovimientoCombo[] = [];
  value: number | null = null;
  search = '';
  selectedIndex = 0;
  columnWidth = 0;

  agInit(params: ICellEditorParams & { movimientos?: MovimientoCombo[] }): void {
    this.params = params;
    this.movimientos = params.movimientos ?? [];
    this.filtered = [...this.movimientos];

    const currentValue = params.value ?? null;
    this.value = currentValue === 0 ? null : currentValue;

    const sel = this.movimientos.find(m => m.id === this.value);
    this.search = sel ? sel.label : '';

    // leer ancho de la columna
    this.columnWidth = params.column
      ? params.column.getActualWidth()
      : 200; // fallback
  }

  afterGuiAttached(): void {
    if (this.input?.nativeElement) {
      setTimeout(() => this.input.nativeElement.select(), 0);
    }
  }

  getValue(): any {
    return this.value ?? 0;
  }

  isPopup(): boolean {
    return true;
  }

  // --------- helpers de búsqueda

  onSearchChange(): void {
    const term = this.search.toLowerCase();
    this.filtered = this.movimientos.filter(m =>
      m.label.toLowerCase().includes(term)
    );

    // reiniciamos el índice dentro del rango
    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;

    // pequeño delay para que Angular pinte la lista y luego mover el scroll
    setTimeout(() => this.ensureItemVisible(), 0);
  }

  private select(index: number): void {
    if (index < 0 || index >= this.filtered.length) return;

    const sel = this.filtered[index];
    if (sel) {
      this.value = sel.id;
      this.search = sel.label;
      this.selectedIndex = index;
    }
  }

  onClickItem(index: number): void {
    this.select(index);
    this.params.stopEditing();
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    this.select(this.selectedIndex);
    this.params.stopEditing();
  }

  onArrowDown(event: Event): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    if (!this.filtered.length) return;

    this.selectedIndex = Math.min(this.selectedIndex + 1, this.filtered.length - 1);
    this.ensureItemVisible();
  }

  onArrowUp(event: Event): void {
    const e = event as KeyboardEvent;
    e.preventDefault();
    if (!this.filtered.length) return;

    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    this.ensureItemVisible();
  }

  // hace scroll para que el li seleccionado quede visible
  private ensureItemVisible(): void {
    if (!this.items || !this.items.length) return;
    const arr = this.items.toArray();
    if (this.selectedIndex < 0 || this.selectedIndex >= arr.length) return;

    const el = arr[this.selectedIndex].nativeElement as HTMLElement;
    el.scrollIntoView({ block: 'nearest' });
  }

  refresh(params: ICellEditorParams): boolean {
    const currentValue = params.value ?? null;
    this.value = currentValue === 0 ? null : currentValue;

    const sel = this.movimientos.find(m => m.id === this.value);
    this.search = sel ? sel.label : '';
    this.filtered = [...this.movimientos];
    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;

    setTimeout(() => this.ensureItemVisible(), 0);
    return true;
  }
}
