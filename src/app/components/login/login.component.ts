import { LoginUsuarioResponse } from './../../interfaces/responses/usuario-log-response';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { LogoService } from 'src/app/services/logo.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  formLogin: FormGroup;
  hidePassword: boolean = true;
  loading: boolean = false;
  logoUrl: string = '';
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private logoService: LogoService,
    private empresaService: EmpresaService
  ) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas: EmpresaResponse[]) => {
        if (empresas.length > 0) {
          const logoFileName = empresas[0].empresaLogo;
          if (logoFileName) {
            this.logoUrl = this.logoService.getLogoUrl(logoFileName);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar la empresa para el logo:', err);
      }
    });
  }

  onLogin(): void {
    this.loading = true;
    const { email, password } = this.formLogin.value;

    this.usuarioService.login(email, password).subscribe({
      next: (user: LoginUsuarioResponse) => {
        console.log('Login exitoso. Usuario:', user);

        // ✅ Guardar usuario completo (incluye cajas)
        localStorage.setItem('currentUser', JSON.stringify(user));

        // ✅ Guardar solo cajas (opcional)
        localStorage.setItem('cajasUsuario', JSON.stringify(user.cajas ?? []));

        // ✅ Caja por defecto (opcional)
        const cajaDefault = (user.cajas && user.cajas.length > 0) ? user.cajas[0] : null;
        if (cajaDefault) {
          localStorage.setItem('cajaSeleccionada', JSON.stringify(cajaDefault));
        } else {
          localStorage.removeItem('cajaSeleccionada');
        }

        // ✅ validar lectura
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const usuarioLocal: LoginUsuarioResponse = JSON.parse(storedUser);
          console.log('Usuario desde localStorage:', usuarioLocal);
          console.log('Cajas desde localStorage:', usuarioLocal.cajas);
        }

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

        this.loading = false;
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
