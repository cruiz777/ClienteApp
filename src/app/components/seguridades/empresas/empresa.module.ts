import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EmpresasRoutingModule } from 'src/app/components/seguridades/empresas/empresa-routing.module';
import { EmpresasListComponent } from 'src/app/components/seguridades/empresas/empresa-list/empresas-list.component';
//import { EmpresaFormComponent } from 'src/app/components/seguridades/empresas/empresa-form/empresa-form.component';
import { HttpClientModule } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VideosAyudaModalComponent } from '../dialogs/videos-ayuda/videos-ayuda-modal.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    EmpresasListComponent,
    VideosAyudaModalComponent
    // EmpresaFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    EmpresasRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTooltipModule
  ]
})
export class EmpresasModule { }
