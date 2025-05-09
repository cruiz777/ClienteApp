import {NgModule}from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';
import{PerfilesListComponent}from'./perfiles-list/perfiles-list.component'

const routes:Routes=[
  {
    path:'',component:PerfilesListComponent
  }
]

@NgModule({
  imports:[RouterModule.forChild(routes)],
  exports:[RouterModule]
})
export class PerfilesRoutingModule { }
