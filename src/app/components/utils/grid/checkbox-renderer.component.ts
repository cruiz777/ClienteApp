import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <input type="checkbox" [(ngModel)]="params.data.seleccionado">
  `
})
export class CheckboxRendererComponents {
  params: any;

  agInit(params: any): void {
    this.params = params;
  }
}
