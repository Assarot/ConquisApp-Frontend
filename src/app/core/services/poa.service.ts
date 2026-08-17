import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Poa, ActividadPoa } from '../models/poa.model';

@Injectable({
  providedIn: 'root'
})
export class PoaService {
  private poaUrl = `${environment.apiUrl}/poa`;

  // Internal memory mock state for seamless updates
  private mockPoas: Poa[] = [
    { idPoa: '1', idClub: '1', anio: 2025, estado: 'COMPLETADO' },
    { idPoa: '2', idClub: '1', anio: 2026, estado: 'ACTIVO' }
  ];

  private mockActividades: { [key: string]: ActividadPoa[] } = {
    '2': [
      { idActividad: '1', idPoa: '2', nombre: 'Campamento de Supervivencia', fecha: '2026-09-18', ambito: 'CLUB', responsable: 'Instructor Juan' },
      { idActividad: '2', idPoa: '2', nombre: 'Desfile del Día del Conquistador', fecha: '2026-10-24', ambito: 'ASOCIACION', responsable: 'Director Esteban' },
      { idActividad: '3', idPoa: '2', nombre: 'Investidura Anual', fecha: '2026-11-15', ambito: 'CLUB', responsable: 'Secretaria María' },
      { idActividad: '4', idPoa: '2', nombre: 'Reunión de Especialidades (Nudos)', fecha: '2026-08-15', ambito: 'RECURRENTE', responsable: 'Instructor Carlos' }
    ],
    '1': [
      { idActividad: '5', idPoa: '1', nombre: 'Campamento de Iniciación 2025', fecha: '2025-04-12', ambito: 'CLUB', responsable: 'Instructor Juan' }
    ]
  };

  constructor(private http: HttpClient) {}

  getPoasByClub(idClub: string): Observable<Poa[]> {
    return this.http.get<Poa[]>(`${this.poaUrl}/club/${idClub}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.getPoasByClub failed (offline), using mock data', err);
          return of(this.mockPoas.filter(p => p.idClub === idClub));
        }
        return throwError(() => err);
      })
    );
  }

  getActividades(idPoa: string): Observable<ActividadPoa[]> {
    return this.http.get<ActividadPoa[]>(`${this.poaUrl}/${idPoa}/actividades`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.getActividades failed (offline), using mock data', err);
          return of(this.mockActividades[idPoa] || []);
        }
        return throwError(() => err);
      })
    );
  }

  inicializarPoa(idClub: string, anio: number): Observable<Poa> {
    let params = new HttpParams().set('anio', anio.toString());
    return this.http.post<Poa>(`${this.poaUrl}/club/${idClub}`, {}, { params }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.inicializarPoa failed (offline), using mock action', err);
          const newPoa: Poa = {
            idPoa: `poa-${anio}`,
            idClub,
            anio,
            estado: 'ACTIVO'
          };
          this.mockPoas.push(newPoa);
          this.mockActividades[newPoa.idPoa] = [];
          return of(newPoa);
        }
        return throwError(() => err);
      })
    );
  }

  addActividad(idPoa: string, actividad: ActividadPoa): Observable<ActividadPoa> {
    return this.http.post<ActividadPoa>(`${this.poaUrl}/${idPoa}/actividades`, actividad).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.addActividad failed (offline), using mock action', err);
          const newAct: ActividadPoa = {
            ...actividad,
            idActividad: `act-mock-${Date.now()}`,
            idPoa
          };
          if (!this.mockActividades[idPoa]) {
            this.mockActividades[idPoa] = [];
          }
          this.mockActividades[idPoa].push(newAct);
          return of(newAct);
        }
        return throwError(() => err);
      })
    );
  }

  reprogramarActividad(idActividad: string, nuevaFecha: string): Observable<any> {
    let params = new HttpParams().set('nuevaFecha', nuevaFecha);
    return this.http.put(`${this.poaUrl}/actividades/${idActividad}/fecha`, {}, { params }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.reprogramarActividad failed (offline), using mock action', err);
          for (const poaId of Object.keys(this.mockActividades)) {
            const acts = this.mockActividades[poaId];
            const idx = acts.findIndex(a => a.idActividad === idActividad);
            if (idx !== -1) {
              acts[idx].fecha = nuevaFecha;
              return of({ success: true, updatedActividad: acts[idx] });
            }
          }
          return of({ success: true });
        }
        return throwError(() => err);
      })
    );
  }

  importarExcel(idPoa: string, file: File): Observable<{ mensaje: string; totalImportadas: number }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string; totalImportadas: number }>(
      `${this.poaUrl}/${idPoa}/import-excel`,
      formData
    );
  }

  actualizarActividad(idActividad: string, datos: Partial<ActividadPoa>): Observable<ActividadPoa> {
    return this.http.put<ActividadPoa>(`${this.poaUrl}/actividades/${idActividad}`, datos).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.actualizarActividad offline mock');
          for (const poaId of Object.keys(this.mockActividades)) {
            const idx = this.mockActividades[poaId].findIndex(a => a.idActividad === idActividad);
            if (idx !== -1) {
              this.mockActividades[poaId][idx] = { ...this.mockActividades[poaId][idx], ...datos };
              return of(this.mockActividades[poaId][idx]);
            }
          }
        }
        return throwError(() => err);
      })
    );
  }

  eliminarActividad(idActividad: string): Observable<void> {
    return this.http.delete<void>(`${this.poaUrl}/actividades/${idActividad}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('PoaService.eliminarActividad offline mock');
          // Remove from mock data
          for (const poaId of Object.keys(this.mockActividades)) {
            this.mockActividades[poaId] = this.mockActividades[poaId]
              .filter(a => a.idActividad !== idActividad);
          }
          return of(void 0);
        }
        return throwError(() => err);
      })
    );
  }

  exportarExcel(idPoa: string): Observable<Blob> {
    return this.http.get(`${this.poaUrl}/${idPoa}/export-excel`, {
      responseType: 'blob'
    });
  }
}
