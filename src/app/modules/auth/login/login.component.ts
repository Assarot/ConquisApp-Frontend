import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          title: '¡Bienvenido!',
          text: 'Sesión iniciada con éxito.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#111827',
          color: '#f3f4f6'
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Error de Autenticación',
          text: 'Correo o contraseña incorrectos.',
          icon: 'error',
          background: '#111827',
          color: '#f3f4f6',
          confirmButtonColor: '#eab308'
        });
      }
    });
  }
}
