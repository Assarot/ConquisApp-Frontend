import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClubBackend {
  idClub?: string;
  nombre: string;
  tipo: string;
  configuracion?: string;
  miembrosCount?: number;
  unidadesCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private apiUrl = `${environment.apiUrl}/clubes`;

  constructor(private http: HttpClient) {}

  getClubes(): Observable<ClubBackend[]> {
    return this.http.get<ClubBackend[]>(this.apiUrl).pipe(
      catchError(err => {
        console.warn('Error fetching clubes from backend, using fallback', err);
        return of([]);
      })
    );
  }

  getClubById(id: string): Observable<ClubBackend> {
    return this.http.get<ClubBackend>(`${this.apiUrl}/${id}`);
  }

  registrarClub(club: ClubBackend): Observable<ClubBackend> {
    return this.http.post<ClubBackend>(this.apiUrl, club);
  }

  registrarClubConDirector(payload: any): Observable<ClubBackend> {
    return this.http.post<ClubBackend>(`${this.apiUrl}/con-director`, payload);
  }

  actualizarClub(id: string, club: ClubBackend): Observable<ClubBackend> {
    return this.http.put<ClubBackend>(`${this.apiUrl}/${id}`, club);
  }

  eliminarClub(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // --- CLASES METODOS ---
  getClases(): Observable<ClaseBackend[]> {
    return this.http.get<ClaseBackend[]>(`${environment.apiUrl}/clases`).pipe(
      catchError(() => of([]))
    );
  }

  registrarClase(clase: ClaseBackend): Observable<ClaseBackend> {
    return this.http.post<ClaseBackend>(`${environment.apiUrl}/clases`, clase);
  }

  eliminarClase(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/clases/${id}`);
  }
}

export interface ClaseBackend {
  idClase?: string;
  nombre: string;
  idClub?: string;
  idVersionCuadernillo?: string;
  versionCuadernillo?: any;
}
