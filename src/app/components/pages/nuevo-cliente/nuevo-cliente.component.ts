import { Component, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogClienteComponent } from '../modals/dialog-cliente/dialog-cliente.component';
@Component({
  selector: 'app-nuevo-cliente',
  templateUrl: './nuevo-cliente.component.html',
  styleUrls: ['./nuevo-cliente.component.css']
})
export class NuevoClienteComponent implements OnInit {

  constructor( private dialog: MatDialog) { }

  ngOnInit(): void {
    this.nuevoCliente();
  }
  nuevoCliente() {
      this.dialog.open(DialogClienteComponent, {
        width: '1200px', // Aumenta el ancho del diálogo
       
        height: '100vh', // ✅ que use casi toda la pantalla
        maxHeight: '100vh',
        disableClose: true
      }).afterClosed().subscribe(result => {
        if (result === "editado")
          result = "editado";
      });
    }
  
}
