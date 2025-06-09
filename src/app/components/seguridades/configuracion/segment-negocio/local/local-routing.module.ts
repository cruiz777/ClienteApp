import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocalesListComponent } from './local-list/local-list.component';

const routes: Routes = [
  { path: '', component: LocalesListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LocalRoutingModule { }
