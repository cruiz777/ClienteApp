import { Component } from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-gcp-brick-autocomplete-editor',
  template: `
    <div style="position: relative;">
      <input
        type="text"
        [(ngModel)]="inputValue"
        (input)="filterOptions()"
        (keydown.enter)="onEnter()"
        class="ag-input"
        style="width: 100%; padding-right: 24px;"
      />
      <button
        *ngIf="inputValue"
        (click)="clearInput()"
        class="clear-button"
        aria-label="Clear"
      >
        ×
      </button>
      <ul *ngIf="filteredOptions.length > 0" class="autocomplete-list">
        <li
          *ngFor="let option of filteredOptions"
          (click)="selectOption(option)"
        >
          {{ option.codigo }} - {{ option.descripcion }} - {{ option.brick }}
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .autocomplete-list {
      position: absolute;
      z-index: 1000;
      background: white;
      border: 1px solid #ccc;
      max-height: 150px;
      overflow-y: auto;
      margin-top: 2px;
      padding: 0;
      list-style: none;
      width: 100%;
    }
    .autocomplete-list li {
      padding: 4px 8px;
      cursor: pointer;
    }
    .autocomplete-list li:hover {
      background-color: #ccc;
    }
    .clear-button {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #888;
      line-height: 1;
      padding: 0;
    }
    .clear-button:hover {
      color: #333;
    }
  `]
})
export class GcpBrickAutocompleteEditorComponent implements ICellEditorAngularComp {
  inputValue: string = '';
  fullOptions: { codigo: string, descripcion: string, brick: string, id_grupo_producto: number }[] = [];
  filteredOptions: { codigo: string, descripcion: string, brick: string, id_grupo_producto: number }[] = [];

  private params: any;

  agInit(params: any): void {
    this.params = params;
    this.fullOptions = params.context?.componentParent?.gcpBricksDisponibles || [];
    const current = this.fullOptions.find(opt => opt.codigo === params.value);
    this.inputValue = current
      ? `${current.codigo} - ${current.descripcion} - ${current.brick}`
      : params.value || '';
    this.filterOptions();
  }

  getValue(): any {
    const match = this.fullOptions.find(opt =>
      `${opt.codigo} - ${opt.descripcion} - ${opt.brick}` === this.inputValue || opt.codigo === this.inputValue
    );
    return match ? match.codigo : this.inputValue;
  }

  filterOptions(): void {
    const val = this.inputValue.toLowerCase();
    this.filteredOptions = this.fullOptions.filter(opt =>
      (`${opt.codigo} - ${opt.descripcion} - ${opt.brick}`).toLowerCase().includes(val)
    ).slice(0, 20);
  }

  selectOption(option: any): void {
    this.inputValue = `${option.codigo} - ${option.descripcion} - ${option.brick} - ${option.id_grupo_producto}`;
    this.filteredOptions = [];
    if (this.params.node) {
      this.params.node.setDataValue('gcpBrick', option.brick);
      this.params.node.setDataValue('grupo', option.id_grupo_producto); // 👈 asigna grupo
    }
    this.params.api.stopEditing();
  }

  onEnter(): void {
    this.filteredOptions = [];
    this.params.api.stopEditing();
  }

  clearInput(): void {
    this.inputValue = '';
    this.filteredOptions = [];
    if (this.params.node) {
      this.params.node.setDataValue('gcpBrick', '');
      this.params.node.setDataValue('grupo', null);
    }
  }
}

