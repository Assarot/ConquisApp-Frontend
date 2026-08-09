import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EspecialidadBackend {
  idEspecialidad?: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  icono?: string;
  puntos?: number;
  idClub?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EspecialidadService {
  private apiUrl = `${environment.apiUrl}/especialidades`;

  constructor(private http: HttpClient) {}

  getEspecialidades(idClub?: string): Observable<EspecialidadBackend[]> {
    const url = idClub ? `${this.apiUrl}?idClub=${idClub}` : this.apiUrl;
    return this.http.get<EspecialidadBackend[]>(url).pipe(
      catchError(err => {
        console.warn('Error fetching especialidades from backend, using fallback', err);
        return of([]);
      })
    );
  }

  getEspecialidadesByCategoria(categoria: string, idClub?: string): Observable<EspecialidadBackend[]> {
    const url = idClub
      ? `${this.apiUrl}/categoria/${categoria}?idClub=${idClub}`
      : `${this.apiUrl}/categoria/${categoria}`;
    return this.http.get<EspecialidadBackend[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  registrarEspecialidad(especialidad: EspecialidadBackend): Observable<EspecialidadBackend> {
    return this.http.post<EspecialidadBackend>(this.apiUrl, especialidad);
  }

  actualizarEspecialidad(id: string, especialidad: EspecialidadBackend): Observable<EspecialidadBackend> {
    return this.http.put<EspecialidadBackend>(`${this.apiUrl}/${id}`, especialidad);
  }

  eliminarEspecialidad(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
