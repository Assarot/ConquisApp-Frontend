import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RequisitoBackend {
  idRequisito?: number;
  descripcion: string;
  esAvanzado: boolean;
  clase?: any;
  especialidad?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitoService {
  private apiUrl = `${environment.apiUrl}/requisitos`;

  constructor(private http: HttpClient) {}

  getRequisitosByClase(idClase: string | number): Observable<RequisitoBackend[]> {
    return this.http.get<RequisitoBackend[]>(`${this.apiUrl}/clase/${idClase}`).pipe(
      catchError(err => {
        console.warn('Error loading class requirements', err);
        return of([]);
      })
    );
  }

  getRequisitosByEspecialidad(idEspecialidad: string | number): Observable<RequisitoBackend[]> {
    return this.http.get<RequisitoBackend[]>(`${this.apiUrl}/especialidad/${idEspecialidad}`).pipe(
      catchError(err => {
        console.warn('Error loading specialty requirements', err);
        return of([]);
      })
    );
  }

  registrarRequisito(payload: any): Observable<RequisitoBackend> {
    return this.http.post<RequisitoBackend>(this.apiUrl, payload);
  }

  eliminarRequisito(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
