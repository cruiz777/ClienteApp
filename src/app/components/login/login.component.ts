import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Usuario } from 'src/app/interfaces/responses/usuario-response';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  formLogin: FormGroup;
  hidePassword:boolean   = true;
  loading: boolean = false;


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private _snackBar: MatSnackBar,
    private usuarioService: UsuarioService
  ) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
  }

  onLogin() {
    this.loading = true;

    const { email, password } = this.formLogin.value;
    console.log('Intentando login con:', email);

    this.usuarioService.login(email, password).subscribe({
      next: (user: Usuario) => {
        console.log('Login exitoso. Usuario:', user);
        this._snackBar.open('Inicio de sesión exitoso', 'Bienvenido', { duration: 3000 });

        this.router.navigateByUrl('/inicio').then(success => {
          if (success) {
            console.log('Navegación exitosa a /inicio');
          } else {
            console.error('Error: Navegación a /inicio fallida.');
            this._snackBar.open('Error al navegar a inicio', 'Error', { duration: 3000 });
          }
        }).catch(err => {
          console.error('Excepción en navegación:', err);
          this._snackBar.open('Error crítico de navegación', 'Error', { duration: 3000 });
        });
      },
      error: (error: any) => {
        console.error('Error en login:', error);
        this._snackBar.open(error.message || 'Credenciales incorrectas', 'Error', { duration: 3000 });
        this.loading = false;
      }
    });
  }
}
