import {
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

interface TipoRetencionCombo {
  id: number;
  label: string; // ej: "001 - RENTA (10%)"
  codigo?: string;    // opcional por si no lo usas aquí para validaciones
  porcentaje?: number;
}

@Component({
  selector: 'app-tipo-retencion-cell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mov-editor" [style.width.px]="columnWidth">
      <input #input
             type="text"
             [(ngModel)]="search"
             (input)="onSearchChange()"
             (keydown.enter)="onEnter($event)"
             (keydown.arrowDown)="onArrowDown($event)"
             (keydown.arrowUp)="onArrowUp($event)" />

      <ul class="mov-list" *ngIf="filtered.length > 0">
        <li *ngFor="let t of filtered; let i = index"
            #itemRef
            [class.selected]="i === selectedIndex"
            (click)="onClickItem(i)">
          {{ t.label }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .mov-editor {
      position: relative;
      width: 100%;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 2px 4px;
    }

    .mov-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 180px;
      overflow-y: auto;
      background: #edf3c9ff;
      border: 1px solid #ccc;
      z-index: 9999;
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
export class TipoRetencionCellEditorComponent implements ICellEditorAngularComp {

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @ViewChildren('itemRef') items!: QueryList<ElementRef<HTMLLIElement>>;

  private params!: ICellEditorParams & { tiposRetencion?: TipoRetencionCombo[] };

  tiposRetencion: TipoRetencionCombo[] = [];
  filtered: TipoRetencionCombo[] = [];
  value: number | null = null;
  search = '';
  selectedIndex = 0;
  columnWidth = 0;

  agInit(params: ICellEditorParams & { tiposRetencion?: TipoRetencionCombo[] }): void {
    this.params = params;

    // lista que viene del grid
    this.tiposRetencion = params.tiposRetencion ?? [];
    this.filtered = [...this.tiposRetencion];

    const currentValue = params.value ?? null;
    this.value = currentValue === 0 ? null : currentValue;

    // mostrar el label actual en el input
    const sel = this.tiposRetencion.find(t => t.id === this.value);
    this.search = sel ? sel.label : '';

    // ancho de la columna
    this.columnWidth = params.column
      ? params.column.getActualWidth()
      : 200;
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

  // --------- búsqueda / navegación

  onSearchChange(): void {
    const term = this.search.toLowerCase();
    this.filtered = this.tiposRetencion.filter(t =>
      t.label.toLowerCase().includes(term)
    );

    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;

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

  private ensureItemVisible(): void {
    if (!this.items || !this.items.length) return;
    const arr = this.items.toArray();
    if (this.selectedIndex < 0 || this.selectedIndex >= arr.length) return;

    const el = arr[this.selectedIndex].nativeElement as HTMLElement;
    el.scrollIntoView({ block: 'nearest' });
  }

  refresh(params: ICellEditorParams & { tiposRetencion?: TipoRetencionCombo[] }): boolean {
    this.params = params;
    this.tiposRetencion = params.tiposRetencion ?? [];
    this.filtered = [...this.tiposRetencion];

    const currentValue = params.value ?? null;
    this.value = currentValue === 0 ? null : currentValue;

    const sel = this.tiposRetencion.find(t => t.id === this.value);
    this.search = sel ? sel.label : '';
    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;

    setTimeout(() => this.ensureItemVisible(), 0);
    return true;
  }
}
