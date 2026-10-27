import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button-renderer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <button mat-icon-button (click)="onClick()">
      <mat-icon>{{ params?.icon || 'visibility' }}</mat-icon>
    </button>
  `
})
export class ButtonRendererComponent {
  params: any;

  agInit(params: any): void {
    this.params = params;
  }

  onClick(): void {
    if (this.params?.onClick) {
      this.params.onClick(this.params);
    }
  }
}
