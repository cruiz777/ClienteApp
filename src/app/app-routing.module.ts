import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

const routes: Routes = [
  {path:'',redirectTo:'login',pathMatch:'full'},
  { path: 'login', component: LoginComponent },
  { path: 'menus', loadChildren: () => import('./components/menus/menus.module').then(x => x.MenusModule) },
  { path: 'pages', loadChildren: () => import('./components/pages/pages.module').then(x => x.PagesModule) },
  {path:'**',component:NotFoundComponent,pathMatch:'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
