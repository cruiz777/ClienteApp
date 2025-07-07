import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { RecuperarClaveRequest } from 'src/app/interfaces/requests/recuperar-clave-request';


@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginFormComponent {
  formRecuperacion: FormGroup;
  enviado = false;

  constructor(private fb: FormBuilder, private usuarioService: UsuarioService) {
    this.formRecuperacion = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  enviarCorreo(): void {
    if (this.formRecuperacion.invalid) return;

    this.enviado = true;

    const data: RecuperarClaveRequest = {
      correo: this.formRecuperacion.value.email,
      id_empresa: 1
    };

    this.usuarioService.enviarCorreoRecuperacion(data).subscribe({
      next: (res) => {
        alert('📧 ' + res.message);
      },
      error: () => {
        alert('❌ Error al enviar correo de recuperación');
      },
      complete: () => {
        this.enviado = false;
      }
    });
  }
}

