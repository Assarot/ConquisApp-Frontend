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
    { idRequisito: 'req-1', descripcion: 'Memorizar y explicar los ideales: Voto y Ley', categoria: 'General', idVersionCuadernillo: 'ver-1' },
    { idRequisito: 'req-2', descripcion: 'Completar la especialidad de Nudos y Amarras', categoria: 'Especialidades', idVersionCuadernillo: 'ver-1' },
    { idRequisito: 'req-3', descripcion: 'Realizar una caminata de 10 km con mochila', categoria: 'Campismo', idVersionCuadernillo: 'ver-1' },
    { idRequisito: 'req-4', descripcion: 'Leer el libro del año del Club', categoria: 'Lectura', idVersionCuadernillo: 'ver-1' }
  ];

  // Internal mock state for Avances
  private mockAvances: { [key: string]: Avance[] } = {
    'miembro-1': [
      { idAvance: 'av-1-1', idMiembro: 'miembro-1', idRequisito: 'req-1', estado: 'COMPLETADO', fechaActualizacion: '2026-08-01', idInstructorResponsable: 'miembro-4' },
      { idAvance: 'av-1-2', idMiembro: 'miembro-1', idRequisito: 'req-2', estado: 'COMPLETADO', fechaActualizacion: '2026-08-02', idInstructorResponsable: 'miembro-4' },
      { idAvance: 'av-1-3', idMiembro: 'miembro-1', idRequisito: 'req-3', estado: 'COMPLETADO', fechaActualizacion: '2026-08-03', idInstructorResponsable: 'miembro-4' },
      { idAvance: 'av-1-4', idMiembro: 'miembro-1', idRequisito: 'req-4', estado: 'COMPLETADO', fechaActualizacion: '2026-08-04', idInstructorResponsable: 'miembro-4' }
    ],
    'miembro-2': [
      { idAvance: 'av-2-1', idMiembro: 'miembro-2', idRequisito: 'req-1', estado: 'COMPLETADO', fechaActualizacion: '2026-08-01', idInstructorResponsable: 'miembro-4' },
      { idAvance: 'av-2-2', idMiembro: 'miembro-2', idRequisito: 'req-2', estado: 'EN_PROGRESO', fechaActualizacion: '2026-08-05', idInstructorResponsable: 'miembro-4' },
      { idAvance: 'av-2-3', idMiembro: 'miembro-2', idRequisito: 'req-3', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: 'av-2-4', idMiembro: 'miembro-2', idRequisito: 'req-4', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined }
    ],
    'miembro-3': [
      { idAvance: 'av-3-1', idMiembro: 'miembro-3', idRequisito: 'req-1', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: 'av-3-2', idMiembro: 'miembro-3', idRequisito: 'req-2', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: 'av-3-3', idMiembro: 'miembro-3', idRequisito: 'req-3', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined },
      { idAvance: 'av-3-4', idMiembro: 'miembro-3', idRequisito: 'req-4', estado: 'PENDIENTE', fechaActualizacion: undefined, idInstructorResponsable: undefined }
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

  getRequisitos(): Observable<Requisito[]> {
    return of(this.mockRequisitos);
  }
}
