import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SesionBackend {
  idSesion?: string;
  idClase?: string;
  titulo: string;
  descripcion?: string;
  fecha?: string;
  duracionMinutos?: number;
  completada?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SesionesService {
  private apiUrl = `${environment.apiUrl}/sesiones`;

  constructor(private http: HttpClient) {}

  getSesionesByClase(idClase: string): Observable<SesionBackend[]> {
    return this.http.get<SesionBackend[]>(`${this.apiUrl}/clase/${idClase}`).pipe(
      catchError(err => {
        console.warn('Error fetching sesiones from backend, using fallback', err);
        return of([]);
      })
    );
  }

  guardarSesion(sesion: SesionBackend): Observable<SesionBackend> {
    return this.http.post<SesionBackend>(this.apiUrl, sesion);
  }
}
