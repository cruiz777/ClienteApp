import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { Usuario } from 'src/app/interfaces/responses/usuario-response';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  formLogin: FormGroup;
  hidePassword: boolean = true;
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private usuarioService: UsuarioService,
    private dialog: MatDialog
  ) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  onLogin(): void {
    this.loading = true;
    const { email, password } = this.formLogin.value;

    this.usuarioService.login(email, password).subscribe({
      next: (user: Usuario) => {
        console.log('Login exitoso. Usuario:', user);

        const data: MessageBoxData = {
          title: 'Inicio de sesión exitoso',
          message: `Bienvenido`,
          type: 'success',
          confirmText: 'Continuar',
          showCancel: false
        };

        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data
        }).afterClosed().subscribe(() => {
          this.router.navigateByUrl('/inicio');
        });
      },
      error: (error: any) => {
        console.error('Error en login:', error);

        const data: MessageBoxData = {
          title: 'Error de inicio de sesión',
          message: error?.message || 'Credenciales incorrectas. Intenta de nuevo.',
          type: 'error',
          confirmText: 'Aceptar',
          showCancel: false
        };

        this.dialog.open(CustomMessageBoxComponent, {
          width: '400px',
          data
        });

        this.loading = false;
      }
    });
  }
}
