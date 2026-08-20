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
  categoria?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitoService {
  private apiUrl = `${environment.apiUrl}/requisitos`;

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`).pipe(
      catchError(err => {
        console.warn('Error loading requirement categories', err);
        return of([]);
      })
    );
  }

  registrarCategoria(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/categorias`, payload);
  }

  actualizarCategoria(id: number | string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/categorias/${id}`, payload);
  }

  eliminarCategoria(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias/${id}`);
  }

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

  exportarEspecialidades(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar-especialidades`, { responseType: 'blob' });
  }

  exportarCuadernillos(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar-cuadernillos`, { responseType: 'blob' });
  }
}
