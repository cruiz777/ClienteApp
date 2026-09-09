import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'app-checkbox-renderer',
  template: `
    <mat-checkbox
      class="mini-checkbox"
      [checked]="value"
      (change)="onChange($event)"
      disableRipple>
    </mat-checkbox>
  `,
  styleUrls: ['./checkbox-renderer.component.css'] // si aún no lo tienes, créalo
})

export class CheckboxRendererComponent implements ICellRendererAngularComp {
  private params: any;
  value: boolean = false;

  agInit(params: any): void {
    this.params = params;
    this.value = this.params.value;
  }

  refresh(): boolean {
    return true;
  }

 onChange(event: any) {
  this.params.node.setDataValue(this.params.colDef.field, event.checked);
}

}
