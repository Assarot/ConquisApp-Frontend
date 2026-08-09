import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Usuario, TokenResponse } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;

  // Signals for state management
  public usuarioSignal = signal<Usuario | null>(null);
  public tokenSignal = signal<string | null>(null);

  public isAuthenticated = computed(() => !!this.tokenSignal());
  public currentUser = computed(() => this.usuarioSignal());

  constructor(private http: HttpClient, private router: Router) {
    // Restore session on load
    const savedToken = localStorage.getItem('club_jwt_token');
    const savedUser = localStorage.getItem('club_usuario');

    if (savedToken && savedUser) {
      this.tokenSignal.set(savedToken);
      this.usuarioSignal.set(JSON.parse(savedUser));
    }
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.authUrl}/login`, { email, password }).pipe(
      tap(res => {
        this.tokenSignal.set(res.token);
        localStorage.setItem('club_jwt_token', res.token);
      }),
      // Once logged in, fetch profile
      tap(() => this.fetchProfile().subscribe()),
      catchError(error => {
        if (error.status === 0) {
          console.warn('Backend login failed (offline), using mock authentication fallback', error);
          return this.mockLogin(email, password);
        }
        return throwError(() => error);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.authUrl}/register`, userData).pipe(
      catchError(error => {
        if (error.status === 0) {
          console.warn('Backend registration failed (offline), using mock registration fallback', error);
          return of({ message: 'Mock registration successful', success: true });
        }
        return throwError(() => error);
      })
    );
  }

  fetchProfile(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.authUrl}/me`).pipe(
      tap(user => {
        this.usuarioSignal.set(user);
        localStorage.setItem('club_usuario', JSON.stringify(user));
      }),
      catchError(error => {
        if (error.status === 0) {
          console.warn('Backend fetch profile failed (offline), using mock profile', error);
          const mockUser: Usuario = this.getMockUserByToken();
          this.usuarioSignal.set(mockUser);
          localStorage.setItem('club_usuario', JSON.stringify(mockUser));
          return of(mockUser);
        }
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    localStorage.removeItem('club_jwt_token');
    localStorage.removeItem('club_usuario');
    this.router.navigate(['/auth/login']);
  }

  // --- MOCK FALLBACK DATA & METHODS ---

  private mockLogin(email: string, password: string): Observable<TokenResponse> {
    // Simple fallback authentication
    const token = 'mock-jwt-token-xyz-123';
    this.tokenSignal.set(token);
    localStorage.setItem('club_jwt_token', token);

    // Determine mock role from email content for convenience
    let roleName = 'CONQUISTADOR';
    if (email.includes('admin')) roleName = 'ADMINISTRADOR';
    else if (email.includes('asociado')) roleName = 'DIRECTOR_ASOCIADO';
    else if (email.includes('director')) roleName = 'DIRECTOR';
    else if (email.includes('secretario')) roleName = 'SECRETARIO';
    else if (email.includes('instructor')) roleName = 'INSTRUCTOR';
    else if (email.includes('consejero')) roleName = 'CONSEJERO';
    else if (email.includes('padre')) roleName = 'PADRE';
    else if (email.includes('conquistador')) roleName = 'CONQUISTADOR';

    const mockUser: Usuario = {
      idUsuario: 'uuid-usuario-mock-001',
      nombre: email.split('@')[0],
      apellido: 'Líder Mock',
      email: email,
      idClub: 'uuid-club-conquistadores-orion',
      rol: {
        idRol: `uuid-rol-${roleName.toLowerCase()}`,
        nombre: roleName
      },
      estado: 'ACTIVO'
    };

    this.usuarioSignal.set(mockUser);
    localStorage.setItem('club_usuario', JSON.stringify(mockUser));

    return of({ token, tokenType: 'Bearer' });
  }

  private getMockUserByToken(): Usuario {
    return {
      idUsuario: 'uuid-usuario-mock-001',
      nombre: 'Esteban',
      apellido: 'Quito',
      email: 'esteban.quito@club.com',
      idClub: 'uuid-club-conquistadores-orion',
      rol: {
        idRol: 'uuid-rol-director',
        nombre: 'DIRECTOR'
      },
      estado: 'ACTIVO'
    };
  }
}
