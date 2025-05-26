import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { Cliente } from '../../../interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';


@Component({
  selector: 'app-navigation-producto',
  templateUrl: './navigation-producto.component.html',
  styleUrl: './navigation-producto.component.css'
})

export class NavigationProductoComponent implements OnInit {
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  clienteSeleccionado: Cliente | null = null;


  constructor(private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
      this.clienteSeleccionado = cliente;
      console.log('Cliente en menú:', cliente);
    });
  }

  //constructor(private breakpointObserver: BreakpointObserver,
    //private router: Router,
    //private clienteSeleccionadoService: ClienteSeleccionadoService) {

    //this.breakpointObserver.observe([Breakpoints.Handset])
      //.subscribe(result => {
      //  this.isHandset = result.matches;
     //   this.isExpanded = !this.isHandset;
      //});

 // }
 // ngOnInit(): void {
 //   this.updateDateTime();
//    setInterval(()=> this.updateDateTime(), 1000); // Actualiza cada segundo
 //   this.clienteSeleccionadoService.clienteSeleccionado$.subscribe(cliente => {
//this.clienteSeleccionado = cliente;
 //     console.log('🧭 Menú recibió cliente:', cliente);
 //   });
 // }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

    capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }

  salir(): void {

       this.router.navigate(['/inicio']).then(() => {
      window.location.reload(); // fuerza la recarga de la pantalla inicio
    });
  }



}
