import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BloqueCronogramaBackend {
  idBloque?: string;
  idCronograma?: string;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  icono?: string;
  color?: string;
  responsable?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CronogramaService {
  private apiUrl = `${environment.apiUrl}/cronogramas`;

  constructor(private http: HttpClient) {}

  getBloques(idCronograma: string = 'cronograma-default'): Observable<BloqueCronogramaBackend[]> {
    return this.http.get<BloqueCronogramaBackend[]>(`${this.apiUrl}/${idCronograma}/bloques`).pipe(
      catchError(err => {
        console.warn('Error fetching bloques cronograma from backend, using fallback', err);
        return of([]);
      })
    );
  }

  registrarBloque(idCronograma: string = 'cronograma-default', bloque: BloqueCronogramaBackend): Observable<BloqueCronogramaBackend> {
    return this.http.post<BloqueCronogramaBackend>(`${this.apiUrl}/${idCronograma}/bloques`, bloque);
  }

  actualizarBloque(idBloque: string, bloque: BloqueCronogramaBackend): Observable<BloqueCronogramaBackend> {
    return this.http.put<BloqueCronogramaBackend>(`${this.apiUrl}/bloques/${idBloque}`, bloque);
  }

  eliminarBloque(idBloque: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bloques/${idBloque}`);
  }
}
