// status-renderer.component.ts
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-badge" [ngClass]="statusClass">
      <span class="status-dot"></span>
      {{ displayValue }}
    </div>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-activo {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .status-activo .status-dot {
      background-color: #22c55e;
    }

    .status-inactivo {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .status-inactivo .status-dot {
      background-color: #ef4444;
    }

    .status-pendiente {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fed7aa;
    }

    .status-pendiente .status-dot {
      background-color: #f59e0b;
    }

    .status-default {
      background-color: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .status-default .status-dot {
      background-color: #64748b;
    }
  `]
})
export class StatusRendererComponent implements ICellRendererAngularComp {
  
  public displayValue!: string;
  public statusClass!: string;

  agInit(params: ICellRendererParams): void {
    this.displayValue = params.value || '';
    this.setStatusClass(this.displayValue);
  }

  refresh(params: ICellRendererParams): boolean {
    this.displayValue = params.value || '';
    this.setStatusClass(this.displayValue);
    return true;
  }

  private setStatusClass(status: string): void {
    switch (status.toLowerCase()) {
      case 'activo':
        this.statusClass = 'status-activo';
        break;
      case 'inactivo':
        this.statusClass = 'status-inactivo';
        break;
      case 'pendiente':
        this.statusClass = 'status-pendiente';
        break;
      default:
        this.statusClass = 'status-default';
    }
  }
}