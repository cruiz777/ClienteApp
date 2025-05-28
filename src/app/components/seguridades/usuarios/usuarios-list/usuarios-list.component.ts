import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UsuariosFormComponent } from '../usuarios-form/usuarios-form.component'; // ajusta el path si es necesario

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.css'
})
export class UsuariosListComponent {
  constructor(private dialog: MatDialog) {}

  filtroUsuario = '';
  usuarios = [
    { id: 1, nombre: 'Juan Pérez', correo: 'juan@example.com', rol: 'Administrador' },
    { id: 2, nombre: 'Ana Torres', correo: 'ana@example.com', rol: 'Usuario' }
  ];
  usuarioSeleccionado: number | null = null;
  botonActivo = '';

  get usuariosFiltrados() {
    return this.usuarios.filter(u =>
      u.nombre.toLowerCase().includes(this.filtroUsuario.toLowerCase()) ||
      u.correo.toLowerCase().includes(this.filtroUsuario.toLowerCase())
    );
  }

  seleccionarUsuario(id: number) {
    this.usuarioSeleccionado = id;
  }

  editarUsuario(usuario: any) {
    console.log('Editar usuario:', usuario);
  }

  eliminarUsuario(id: number) {
    console.log('Eliminar usuario:', id);
  }

  onNuevoUsuario() {
    this.botonActivo = 'nuevo';
    this.dialog.open(UsuariosFormComponent, {
      width: '800px'
    });
  }
}
