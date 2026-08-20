import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Avance, Requisito, AsistenciaMasivaRequest } from '../models/avance-asistencia.model';

@Injectable({
  providedIn: 'root'
})
export class AvanceAsistenciaService {
  private avancesUrl = `${environment.apiUrl}/avances`;
  private asistenciasUrl = `${environment.apiUrl}/asistencias`;

  // Internal mock state for Requisitos
  private mockRequisitos: Requisito[] = [
    { idRequisito: '1', descripcion: 'Memorizar y explicar los ideales: Voto y Ley', categoria: 'General', idVersionCuadernillo: '1' },
    { idRequisito: '2', descripcion: 'Completar la especialidad de Nudos y Amarras', categoria: 'Especialidades', idVersionCuadernillo: '1' },
    { idRequisito: '3', descripcion: 'Realizar una caminata de 10 km con mochila', categoria: 'Campismo', idVersionCuadernillo: '1' },
    { idRequisito: '4', descripcion: 'Leer el libro del año del Club', categoria: 'Lectura', idVersionCuadernillo: '1' }
  ];

  // Internal mock state for Avances
  private mockAvances: { [key: string]: Avance[] } = {
    '1': [
      { idAvance: '1', idMiembro: '1', idRequisito: '1', estado: 'COMPLETADO', fechaActualizacion: '2026-08-01', idInstructorResponsable: '5' },
      { idAvance: '2', idMiembro: '1', idRequisito: '2', estado: 'COMPLETADO', fechaActualizacion: '2026-08-02', idInstructorResponsable: '5' },
      { idAvance: '3', idMiembro: '1', idRequisito: '3', estado: 'COMPLETADO', fechaActualizacion: '2026-08-03', idInstructorResponsable: '5' },
      { idAvance: '4', idMiembro: '1', idRequisito: '4', estado: 'COMPLETADO', fechaActualizacion: '2026-08-04', idInstructorResponsable: '5' }
    ],
    '2': [
      { idAvance: '5', idMiembro: '2', idRequisito: '1', estado: 'COMPLETADO', fechaActualizacion: '2026-08-01', idInstructorResponsable: '5' },
      { idAvance: '6', idMiembro: '2', idRequisito: '2', estado: 'EN_PROGRESO', fechaActualizacion: '2026-08-05', idInstructorResponsable: '5' },
      { idAvance: '7', idMiembro: '2', idRequisito: '3', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: '8', idMiembro: '2', idRequisito: '4', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined }
    ],
    '3': [
      { idAvance: '9', idMiembro: '3', idRequisito: '1', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: '10', idMiembro: '3', idRequisito: '2', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: '11', idMiembro: '3', idRequisito: '3', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: '12', idMiembro: '3', idRequisito: '4', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined }
    ]
  };

  constructor(private http: HttpClient) {}

  getAvancesByMiembro(idMiembro: string): Observable<Avance[]> {
    return this.http.get<Avance[]>(`${this.avancesUrl}/miembro/${idMiembro}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn(`AvanceService.getAvancesByMiembro failed for ${idMiembro} (offline), using mock data`, err);
          if (!this.mockAvances[idMiembro]) {
            this.mockAvances[idMiembro] = this.mockRequisitos.map((req, idx) => ({
              idAvance: `av-gen-${idMiembro}-${idx}`,
              idMiembro,
              idRequisito: req.idRequisito,
              estado: 'PENDIENTE'
            }));
          }
          const mapped = this.mockAvances[idMiembro].map(av => ({
            ...av,
            requisito: this.mockRequisitos.find(r => r.idRequisito === av.idRequisito)
          }));
          return of(mapped);
        }
        return throwError(() => err);
      })
    );
  }

  corregirAvance(idAvance: string, nuevoEstado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO'): Observable<any> {
    let params = new HttpParams().set('nuevoEstado', nuevoEstado);
    return this.http.put(`${this.avancesUrl}/${idAvance}/correccion`, {}, { params }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn(`AvanceService.corregirAvance failed for ${idAvance} (offline), using mock action`, err);
          for (const miembId of Object.keys(this.mockAvances)) {
            const avs = this.mockAvances[miembId];
            const idx = avs.findIndex(a => a.idAvance === idAvance);
            if (idx !== -1) {
              avs[idx].estado = nuevoEstado;
              avs[idx].fechaActualizacion = new Date().toISOString().split('T')[0];
              return of({ success: true, updatedAvance: avs[idx] });
            }
          }
          return of({ success: true });
        }
        return throwError(() => err);
      })
    );
  }

  registrarAsistenciaMasiva(request: AsistenciaMasivaRequest): Observable<any> {
    return this.http.post<any>(`${this.asistenciasUrl}`, request).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('AsistenciaService.registrarAsistenciaMasiva failed (offline), using mock action', err);
          return of({
            success: true,
            message: 'Asistencia masiva registrada exitosamente. (Simulado)',
            count: request.asistencias.length
          });
        }
        return throwError(() => err);
      })
    );
  }

  getAsistenciasBySesion(idSesion: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.asistenciasUrl}/sesion/${idSesion}`).pipe(
      catchError(err => {
        console.warn('Error fetching asistencias by sesion', err);
        return of([]);
      })
    );
  }

  getAsistenciasByUnidad(idUnidad: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.asistenciasUrl}/unidad/${idUnidad}`).pipe(
      catchError(err => {
        console.warn('Error fetching asistencias by unidad', err);
        return of([]);
      })
    );
  }

  registrarAsistencias(asistencias: any[]): Observable<any[]> {
    return this.http.post<any[]>(this.asistenciasUrl, asistencias).pipe(
      catchError(err => {
        console.error('Error saving asistencias', err);
        return throwError(() => err);
      })
    );
  }

  getRequisitos(): Observable<Requisito[]> {
    return of(this.mockRequisitos);
  }
}
