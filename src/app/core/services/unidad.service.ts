import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Unidad } from '../../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class UnidadService {
  private unidadesUrl = `${environment.apiUrl}/unidades`;

  // Mock data fallback when backend offline
  private mockUnidades: Unidad[] = [
    { idUnidad: 'unidad-orion-1', nombre: 'Halcones' },
    { idUnidad: 'unidad-orion-2', nombre: 'Águilas' }
  ];

  constructor(private http: HttpClient) {}

  getUnidades(): Observable<Unidad[]> {
    return this.http.get<Unidad[]>(this.unidadesUrl).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('UnidadService.getUnidades failed (offline), using mock data', err);
          return of(this.mockUnidades);
        }
        return throwError(() => err);
      })
    );
  }

  crearUnidad(unidad: Unidad): Observable<Unidad> {
    return this.http.post<Unidad>(this.unidadesUrl, unidad).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('UnidadService.crearUnidad failed (offline), simulating locally', err);
          const newUnidad = { ...unidad, idUnidad: unidad.idUnidad || `unidad-mock-${Date.now()}` };
          this.mockUnidades.push(newUnidad);
          return of(newUnidad);
        }
        return throwError(() => err);
      })
    );
  }

  actualizarUnidad(id: string, unidad: Partial<Unidad>): Observable<Unidad> {
    return this.http.put<Unidad>(`${this.unidadesUrl}/${id}`, unidad).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('UnidadService.actualizarUnidad failed (offline), simulating locally', err);
          const idx = this.mockUnidades.findIndex(u => u.idUnidad === id);
          if (idx !== -1) {
            this.mockUnidades[idx] = { ...this.mockUnidades[idx], ...unidad } as Unidad;
            return of(this.mockUnidades[idx]);
          }
          return of({ idUnidad: id, ...(unidad as any) } as Unidad);
        }
        return throwError(() => err);
      })
    );
  }

  eliminarUnidad(id: string): Observable<void> {
    return this.http.delete<void>(`${this.unidadesUrl}/${id}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('UnidadService.eliminarUnidad failed (offline), simulating locally', err);
          this.mockUnidades = this.mockUnidades.filter(u => u.idUnidad !== id);
          return of(undefined);
        }
        return throwError(() => err);
      })
    );
  }
}
