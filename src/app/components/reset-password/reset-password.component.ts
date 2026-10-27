import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioService } from 'src/app/services/usuario.service';
import { UpdateClaveRequest } from 'src/app/interfaces/requests/recuperar-clave-request';
import { RequiredFieldsToastService } from 'src/app/components/utils/messages/required-fields-toast.service';

// Valida que ambas contraseñas coincidan
export function matchPasswords(group: FormGroup): { [key: string]: boolean } | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  formReset: FormGroup;
  token: string = '';
  nivelSeguridad: string = '';
  mostrarPassword: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private router: Router,
    private usuarioService: UsuarioService,
    private toast: RequiredFieldsToastService
  ) {
    this.formReset = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: matchPasswords });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      alert('❌ Token inválido o expirado');
      this.router.navigate(['/login']);
    }

    this.formReset.get('password')?.valueChanges.subscribe(val => {
      this.verificarSeguridad(val);
    });
  }

  verificarSeguridad(password: string): void {
    const puntos = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[\W_]/.test(password),
      password.length >= 8
    ].filter(Boolean).length;

    if (puntos <= 2) this.nivelSeguridad = 'Débil';
    else if (puntos <= 4) this.nivelSeguridad = 'Media';
    else this.nivelSeguridad = 'Alta';
  }

  guardar(): void {
    const errores: string[] = [];

    const passwordCtrl = this.formReset.get('password');
    const confirmCtrl = this.formReset.get('confirmPassword');

    if (passwordCtrl?.errors) {
      if (passwordCtrl.errors['required']) errores.push('Contraseña es requerida');
      if (passwordCtrl.errors['minlength']) errores.push('Contraseña debe tener al menos 8 caracteres');
      if (passwordCtrl.errors['pattern']) errores.push('Debe incluir mayúscula, minúscula, número y símbolo');
    }

    if (confirmCtrl?.errors?.['required']) errores.push('Confirmar contraseña es requerida');
    if (this.formReset.errors?.['mismatch']) errores.push('Las contraseñas no coinciden');

    if (errores.length > 0) {
      this.toast.mostrar(errores);
      return;
    }

    const data: UpdateClaveRequest = {
      token: this.token,
      nuevaClave: passwordCtrl!.value
    };

    this.usuarioService.actualizarClave(data).subscribe({
      next: (res) => {
        this.toast.exito(res.message || 'Contraseña actualizada correctamente');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al actualizar la contraseña';
        this.toast.error(mensaje);
        console.error('❌ Error al actualizar contraseña:', err);
      }
    });
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }


}
