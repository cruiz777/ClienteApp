// src/app/components/cg-3000/transacciones/asientos-contables/asientos-contables-form/local-cell-editor.component.ts

import { Component, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

interface LocalItem {
  id: number;
  nombre: string;
}

@Component({
  standalone: true,
  selector: 'app-local-cell-editor',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="local-editor" [style.width.px]="columnWidth">
      <input #input
             type="text"
             [(ngModel)]="search"
             (input)="onSearchChange()"
             (keydown.enter)="onEnter($event)"
             (keydown.arrowDown)="onArrowDown($event)"
             (keydown.arrowUp)="onArrowUp($event)" />

      <ul class="local-list" *ngIf="filtered.length > 0">
        <li *ngFor="let l of filtered; let i = index"
            #itemRef
            [class.selected]="i === selectedIndex"
            (click)="onClickItem(i)">
          {{ l.id }} - {{ l.nombre }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .local-editor { position: relative; width: 100%; }
    input { width: 100%; box-sizing: border-box; padding: 2px 4px; }
    .local-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 160px;
      overflow-y: auto;
      background:  #edf3c9ff;
      border: 1px solid #ccc;
      z-index: 10;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .local-list li {
      padding: 2px 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .local-list li.selected {
      background: #1976d2;
      color: #fff;
    }
  `]
})
export class LocalCellEditorComponent implements ICellEditorAngularComp {

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @ViewChildren('itemRef') items!: QueryList<ElementRef<HTMLLIElement>>;

  private params!: ICellEditorParams & { locales?: LocalItem[] };

  locales: LocalItem[] = [];
  filtered: LocalItem[] = [];
  value: number | null = null;
  search = '';
  selectedIndex = 0;
  columnWidth = 0;

  agInit(params: ICellEditorParams & { locales?: LocalItem[] }): void {
    this.params = params;
    this.locales = params.locales ?? [];
    this.filtered = [...this.locales];

    const currentValue = params.value ?? null;
    this.value = currentValue === 0 ? null : currentValue;

    const sel = this.locales.find(l => l.id === this.value);
    this.search = sel ? `${sel.id} - ${sel.nombre}` : '';

    if (sel) {
      const idx = this.filtered.findIndex(l => l.id === sel.id);
      this.selectedIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedIndex = this.filtered.length > 0 ? 0 : -1;
    }

    this.columnWidth = params.column
    ? params.column.getActualWidth()
    : 200;

  }

  afterGuiAttached(): void {
    if (this.input?.nativeElement) {
      setTimeout(() => this.input.nativeElement.select(), 0);
    }
    setTimeout(() => this.ensureItemVisible(), 0);
  }

  getValue(): any {
    // lo que se devuelve se grabará en idLocal
    return this.value ?? 0;
  }

  isPopup(): boolean {
    return true;
  }

  // --------- helpers de búsqueda y navegación

  onSearchChange(): void {
    const term = this.search.toLowerCase();
    this.filtered = this.locales.filter(l =>
      (`${l.id} - ${l.nombre}`).toLowerCase().includes(term)
    );

    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;
    setTimeout(() => this.ensureItemVisible(), 0);
  }

  private select(index: number): void {
    if (index < 0 || index >= this.filtered.length) return;

    const sel = this.filtered[index];
    if (sel) {
      this.value = sel.id;
      this.search = `${sel.id} - ${sel.nombre}`;
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

  // hace scroll para que el <li> seleccionado quede visible
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

    const sel = this.locales.find(l => l.id === this.value);
    this.search = sel ? `${sel.id} - ${sel.nombre}` : '';
    this.filtered = [...this.locales];

    if (sel) {
      const idx = this.filtered.findIndex(l => l.id === sel.id);
      this.selectedIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedIndex = this.filtered.length > 0 ? 0 : -1;
    }

    setTimeout(() => this.ensureItemVisible(), 0);
    return true;
  }
}
