import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RankingUnidadBackend {
  idRanking?: string;
  idUnidad?: string;
  nombreUnidad?: string;
  puntaje: number;
  periodo: string;
  reglamento?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  getRankingByClub(idClub: string): Observable<RankingUnidadBackend[]> {
    return this.http.get<RankingUnidadBackend[]>(`${this.apiUrl}/ranking/club/${idClub}`).pipe(
      catchError(err => {
        console.warn('Error fetching ranking from backend, using fallback', err);
        return of([]);
      })
    );
  }

  getIndicadoresByClub(idClub: string): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/indicadores/club/${idClub}`).pipe(
      catchError(() => of({}))
    );
  }

  registrarPuntaje(idUnidad: string, puntaje: number, periodo: string, reglamento: string): Observable<RankingUnidadBackend> {
    return this.http.post<RankingUnidadBackend>(
      `${this.apiUrl}/ranking/unidad/${idUnidad}?puntaje=${puntaje}&periodo=${encodeURIComponent(periodo)}&reglamento=${encodeURIComponent(reglamento)}`,
      {}
    );
  }
}
