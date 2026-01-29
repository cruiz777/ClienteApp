import {
  Component, ElementRef, ViewChild, ViewChildren, QueryList
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

import { FormaPagoSriService } from 'src/app/services/forma-pago-sri.service';

export interface FormaPagoSriCombo {
  id: number;
  label: string;
  codigoSri: string;
  descripcion: string;
}

type ParamsExt = ICellEditorParams & {
  formasPagoSri?: FormaPagoSriCombo[];
};

@Component({
  selector: 'app-formapago-sri-cell-editor',
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
            (mousedown)="onMouseDownItem(i, $event)">
          {{ t.label }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .mov-editor { position: relative; width: 100%; }
    input { width: 100%; box-sizing: border-box; padding: 2px 4px; }
    .mov-list {
      position: absolute; top: 100%; left: 0; right: 0;
      max-height: 180px; overflow-y: auto;
      background: #edf3c9ff; border: 1px solid #ccc;
      z-index: 9999; margin: 0; padding: 0; list-style: none;
      font-size: 12px;
    }
    .mov-list li { padding: 2px 4px; cursor: pointer; }
    .mov-list li.selected { background: #1976d2; color: #fff; }
  `],
})
export class FormapagoSriCellEditorComponent implements ICellEditorAngularComp {
  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @ViewChildren('itemRef') items!: QueryList<ElementRef<HTMLLIElement>>;

  private params!: ParamsExt;

  formasPagoSri: FormaPagoSriCombo[] = [];
  filtered: FormaPagoSriCombo[] = [];

  value: number | null = null;    // ✅ ID seleccionado
  search = '';
  selectedIndex = 0;
  columnWidth = 260;

  constructor(private formaPagoSriService: FormaPagoSriService) {}

  agInit(params: ParamsExt): void {
    this.params = params;
    this.columnWidth = params.column ? params.column.getActualWidth() : 260;

    const currentValue = Number(params.value ?? 0);
    this.value = currentValue > 0 ? currentValue : null;

    const lista = params.formasPagoSri ?? [];
    if (lista.length > 0) {
      this.setData(lista);
      this.syncSearchFromValue();
      return;
    }

    // fallback: cargar por HTTP si no llegó por params
    this.formaPagoSriService.getAll().subscribe({
      next: (resp: any) => {
        const arr = Array.isArray(resp) ? resp : (resp?.data ?? []);
        const mapped = (arr ?? []).map((x: any) => this.mapToCombo(x));
        this.setData(mapped);
        this.syncSearchFromValue();
      },
      error: () => {
        this.setData([]);
        this.syncSearchFromValue();
      },
    });
  }

  afterGuiAttached(): void {
    setTimeout(() => this.input?.nativeElement?.select(), 0);
  }

  // ✅ devuelve ID (igual que Porcentaje IVA)
  getValue(): any {
    return this.value ?? 0;
  }

  isPopup(): boolean {
    return true;
  }

  refresh(params: ParamsExt): boolean {
    this.params = params;
    const lista = params.formasPagoSri ?? [];
    if (lista.length > 0) this.setData(lista);

    const currentValue = Number(params.value ?? 0);
    this.value = currentValue > 0 ? currentValue : null;

    this.syncSearchFromValue();
    this.onSearchChange();
    return true;
  }

  onSearchChange(): void {
    const term = (this.search ?? '').toLowerCase().trim();

    this.filtered = !term
      ? [...this.formasPagoSri]
      : this.formasPagoSri.filter(t =>
          (t.label ?? '').toLowerCase().includes(term) ||
          (t.codigoSri ?? '').toLowerCase().includes(term) ||
          (t.descripcion ?? '').toLowerCase().includes(term)
        );

    this.selectedIndex = this.filtered.length ? 0 : -1;
    setTimeout(() => this.ensureItemVisible(), 0);
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

  onMouseDownItem(index: number, ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.select(index);
    this.params.stopEditing();
  }

  private select(index: number): void {
    if (index < 0 || index >= this.filtered.length) return;
    const sel = this.filtered[index];
    this.value = Number(sel.id);
    this.search = sel.label;
    this.selectedIndex = index;
  }

  private ensureItemVisible(): void {
    if (!this.items || !this.items.length) return;
    const arr = this.items.toArray();
    if (this.selectedIndex < 0 || this.selectedIndex >= arr.length) return;
    arr[this.selectedIndex].nativeElement.scrollIntoView({ block: 'nearest' });
  }

  private mapToCombo(x: any): FormaPagoSriCombo {
    const codigo = String(x.codigoSri ?? '').trim();
    const desc = String(x.descripcion ?? '').trim();
    return {
      id: Number(x.idFormaPagoSri ?? x.id ?? 0),
      codigoSri: codigo,
      descripcion: desc,
      label: codigo ? `${codigo} - ${desc}` : desc,
    };
  }

  private setData(lista: FormaPagoSriCombo[]): void {
    this.formasPagoSri = lista ?? [];
    this.filtered = [...this.formasPagoSri];
  }

  private syncSearchFromValue(): void {
    if (!this.value) return;
    const sel = this.formasPagoSri.find(t => Number(t.id) === Number(this.value));
    if (sel) this.search = sel.label;
  }
}
