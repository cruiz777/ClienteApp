// src/app/asientos/asientos-form/plan-cuentas-dialog.component.ts
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith, catchError, of } from 'rxjs';
import { PlanCuentasService, CuentaPlanDTO, PlanCuentasPage } from './plan-cuentas.service';

export interface CuentaPlan extends CuentaPlanDTO {}

@Component({
  selector: 'app-plan-cuentas-dialog',
  template: `
    <h2 mat-dialog-title>Plan de Cuentas</h2>
    <mat-dialog-content class="content">
      <div class="toolbar">
        <mat-form-field appearance="outline" class="w100">
          <mat-label>Buscar</mat-label>
          <input matInput [formControl]="filtroCtrl" placeholder="Código o descripción…">
        </mat-form-field>
      </div>

      <div class="tabla-wrap">
        <table mat-table [dataSource]="rows" matSort (matSortChange)="onSort($event)" class="mat-elevation-z1">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Código </th>
            <td mat-cell *matCellDef="let r" (dblclick)="seleccionar(r)">{{ r.codigo }}</td>
          </ng-container>

          <ng-container matColumnDef="descripcion">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Descripción </th>
            <td mat-cell *matCellDef="let r" (dblclick)="seleccionar(r)">{{ r.descripcion }}</td>
          </ng-container>

          <ng-container matColumnDef="accion">
            <th mat-header-cell *matHeaderCellDef> </th>
            <td mat-cell *matCellDef="let r">
              <button mat-stroked-button color="primary" (click)="seleccionar(r)">Elegir</button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <div class="loading" *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <mat-paginator [length]="total" [pageIndex]="pageIndex" [pageSize]="pageSize"
                       [pageSizeOptions]="[10,15,25,50]" (page)="onPage($event)">
        </mat-paginator>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .content { min-width: 760px; }
    .toolbar { margin-bottom: 8px; }
    .w100 { width: 100%; }
    .tabla-wrap { position: relative; }
    table { width: 100%; }
    .loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
               background: rgba(255,255,255,.5); }
  `]
})
export class PlanCuentasDialogComponent implements OnInit, OnDestroy {
  cols = ['codigo','descripcion','accion'];
  filtroCtrl = new FormControl<string>('');
  rows: CuentaPlanDTO[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 15;
  sortField = 'codigo';
  sortDir: 'asc' | 'desc' = 'asc';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroyed = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { filtro?: string } | null,
    private ref: MatDialogRef<PlanCuentasDialogComponent>,
    private svc: PlanCuentasService
  ) {}

  ngOnInit(): void {
    if (this.data?.filtro) this.filtroCtrl.setValue(this.data.filtro);
    this.filtroCtrl.valueChanges.pipe(
      startWith(this.filtroCtrl.value ?? ''),
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(() => { this.pageIndex = 0; this.load(); });
    this.load();
  }

  load() {
    if (this.destroyed) return;
    this.loading = true;
    this.svc.buscar(
      this.filtroCtrl.value ?? '', this.pageIndex, this.pageSize, this.sortField, this.sortDir
    ).pipe(
      catchError(() => of({ items: [], total: 0 } as PlanCuentasPage))
    ).subscribe(res => {
      if (this.destroyed) return;
      this.rows = res.items;
      this.total = res.total;
      this.loading = false;
    });
  }

  onPage(ev: any) { this.pageIndex = ev.pageIndex; this.pageSize = ev.pageSize; this.load(); }
  onSort(ev: any) {
    this.sortField = ev.active || 'codigo';
    this.sortDir   = (ev.direction as 'asc'|'desc') || 'asc';
    this.pageIndex = 0; this.load();
  }

  seleccionar(r: CuentaPlanDTO) { this.ref.close(r); }
  ngOnDestroy(): void { this.destroyed = true; }
}
