import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UsuarioService } from 'src/app/services/usuario.service';
import { UsuariosResponse } from 'src/app/interfaces/responses/usuario-response';
import { UsuariosFormComponent } from '../usuarios-form/usuarios-form.component';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.css'
})
export class UsuariosListComponent implements OnInit {

  usuarios: UsuariosResponse[] = [];
  filtroUsuario = '';
  usuarioSeleccionado: number | null = null;
  botonActivo = '';

  constructor(
    private dialog: MatDialog,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  /**
   * Filtra usuarios por nombre o correo usando el campo de búsqueda.
   */
  get usuariosFiltrados() {
    return this.usuarios.filter(u =>
      u.nombre_usuario.toLowerCase().includes(this.filtroUsuario.toLowerCase()) ||
      (u.correo || '').toLowerCase().includes(this.filtroUsuario.toLowerCase())
    );
  }

  /**
   * Establece el usuario seleccionado por su ID.
   */
  seleccionarUsuario(id: number) {
    this.usuarioSeleccionado = id;
  }

  /**
   * Muestra en consola los datos del usuario que se desea editar.
   */
  editarUsuario(usuario: UsuariosResponse) {
    this.botonActivo = 'editar';

    this.usuarioService.getUsuarioById(usuario.id_usuario).subscribe(response => {
      const detalle = response.data; // ← aquí accedes al objeto real

      console.log('🧪 Detalle recibido para edición:', detalle);

      const dialogRef = this.dialog.open(UsuariosFormComponent, {
        width: '800px',
        data: {
          modo: 'editar',
          usuario: detalle
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.cargarUsuarios(); // ← recarga lista después de editar
        }
      });

    });
  }


  /**
   * Muestra en consola el ID del usuario a eliminar.
   */
  eliminarUsuario(id: number) {
    console.log('Eliminar usuario:', id);
  }

  /**
   * Abre el diálogo para crear un nuevo usuario.
   */
  onNuevoUsuario() {
    this.botonActivo = 'nuevo';
    const dialogRef = this.dialog.open(UsuariosFormComponent, {
      width: '800px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.cargarUsuarios(); // ✅ solo después de guardar
      }
    });
  }

  /**
   * Llama al servicio para cargar la lista de usuarios.
   */
  cargarUsuarios() {
    this.usuarioService.getUsuarios().subscribe(response => {
      this.usuarios = response.data;
    });
  }
}
