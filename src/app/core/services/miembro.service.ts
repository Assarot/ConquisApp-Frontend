import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Miembro } from '../models/miembro.model';

@Injectable({
  providedIn: 'root'
})
export class MiembroService {
  private miembrosUrl = `${environment.apiUrl}/miembros`;

  // Internal memory mock state for members (used only if backend is offline)
  private mockMiembros: Miembro[] = [
    {
      idMiembro: '1',
      nombre: 'Esteban',
      apellido: 'Quito',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'ACTUALIZADA',
      estadoSeguro: 'POSEE_SEGURO',
      estadoAdhesionPadres: 'FIRMADA',
      pendientes: 0,
      idClub: '1',
      idUnidad: '1',
      idClase: '6',
      nombreUnidad: 'Halcones',
      nombreClase: 'Guía'
    },
    {
      idMiembro: '2',
      nombre: 'Aquiles',
      apellido: 'Brinco',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'PENDIENTE',
      estadoSeguro: 'POSEE_SEGURO',
      estadoAdhesionPadres: 'FIRMADA',
      pendientes: 1,
      idClub: '1',
      idUnidad: '1',
      idClase: '2',
      nombreUnidad: 'Halcones',
      nombreClase: 'Compañero'
    },
    {
      idMiembro: '3',
      nombre: 'Elsa',
      apellido: 'Pato',
      funcion: 'CONQUISTADOR',
      estado: 'ACTIVO',
      estadoFichaSalud: 'PENDIENTE',
      estadoSeguro: 'NO_POSEE_SEGURO',
      estadoAdhesionPadres: 'PENDIENTE',
      pendientes: 3,
      idClub: '1',
      idUnidad: '2',
      idClase: '1',
      nombreUnidad: 'Águilas',
      nombreClase: 'Amigo'
    }
  ];

  constructor(private http: HttpClient) {}

  getMiembrosByClub(idClub: string): Observable<Miembro[]> {
    return this.http.get<any[]>(`${this.miembrosUrl}/club/${idClub}`).pipe(
      map(list => list.map(m => ({
        ...m,
        idClub: String(m.club?.idClub || m.idClub || ''),
        idUnidad: String(m.unidad?.idUnidad || m.idUnidad || ''),
        idClase: String(m.clase?.idClase || m.idClase || ''),
        nombreUnidad: m.unidad?.nombre || m.nombreUnidad,
        nombreClase: m.clase?.nombre || m.nombreClase
      }))),
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.getMiembrosByClub failed (offline), using mock data', err);
          return of(this.mockMiembros.filter(m => m.idClub === idClub));
        }
        return throwError(() => err);
      })
    );
  }

  registrarMiembro(miembro: any): Observable<Miembro> {
    return this.http.post<any>(this.miembrosUrl, miembro).pipe(
      map(m => ({
        ...m,
        idClub: String(m.club?.idClub || m.idClub || ''),
        idUnidad: String(m.unidad?.idUnidad || m.idUnidad || ''),
        idClase: String(m.clase?.idClase || m.idClase || ''),
        nombreUnidad: m.unidad?.nombre || m.nombreUnidad,
        nombreClase: m.clase?.nombre || m.nombreClase
      })),
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.registrarMiembro failed (offline), simulating locally', err);
          const newMiemb: Miembro = {
            ...miembro,
            idMiembro: miembro.idMiembro || `miembro-mock-${Date.now()}`,
            estado: miembro.estado || 'ACTIVO',
            idClub: miembro.club?.idClub?.toString() || '1',
            idUnidad: miembro.unidad?.idUnidad?.toString() || '1',
            idClase: miembro.clase?.idClase?.toString() || '6',
            nombreUnidad: miembro.unidad?.idUnidad?.toString() === '1' ? 'Halcones' : miembro.unidad?.idUnidad?.toString() === '2' ? 'Águilas' : miembro.unidad?.idUnidad?.toString() === '3' ? 'Leones' : 'Estrellas',
            nombreClase: miembro.clase?.idClase?.toString() === '6' ? 'Guía' : miembro.clase?.idClase?.toString() === '2' ? 'Compañero' : 'Amigo',
            pendientes: this.calculateMockPendientes(miembro)
          };
          
          if (miembro.idMiembro) {
            const idx = this.mockMiembros.findIndex(m => m.idMiembro === miembro.idMiembro);
            if (idx !== -1) {
              this.mockMiembros[idx] = newMiemb;
            }
          } else {
            this.mockMiembros.push(newMiemb);
          }
          return of(newMiemb);
        }
        return throwError(() => err);
      })
    );
  }

  cambiarUnidad(idMiembro: string, idUnidadDestino: string): Observable<Miembro> {
    let params = new HttpParams().set('idUnidadDestino', idUnidadDestino);
    return this.http.put<Miembro>(`${this.miembrosUrl}/${idMiembro}/unidad`, {}, { params }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.cambiarUnidad failed (offline), simulating locally', err);
          const idx = this.mockMiembros.findIndex(m => m.idMiembro === idMiembro);
          if (idx !== -1) {
            this.mockMiembros[idx].idUnidad = idUnidadDestino;
            this.mockMiembros[idx].nombreUnidad = idUnidadDestino === '1' ? 'Halcones' : idUnidadDestino === '2' ? 'Águilas' : idUnidadDestino === '3' ? 'Leones' : 'Estrellas';
            return of(this.mockMiembros[idx]);
          }
        }
        return throwError(() => err);
      })
    );
  }

  inactivarMiembro(idMiembro: string): Observable<Miembro> {
    return this.http.delete<Miembro>(`${this.miembrosUrl}/${idMiembro}`).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.inactivarMiembro failed (offline), simulating locally', err);
          const idx = this.mockMiembros.findIndex(m => m.idMiembro === idMiembro);
          if (idx !== -1) {
            this.mockMiembros[idx].estado = 'INACTIVO';
            return of(this.mockMiembros[idx]);
          }
        }
        return throwError(() => err);
      })
    );
  }

  importarMiembrosExcel(file: File, idClub: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idClub', idClub);

    return this.http.post<any>(`${this.miembrosUrl}/importar`, formData, { responseType: 'text' as 'json' }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.importarMiembrosExcel failed (offline), simulating locally', err);
          return of({
            success: true,
            message: 'Importación masiva completada con éxito. (Simulado)'
          });
        }
        return throwError(() => err);
      })
    );
  }

  exportarExcel(idClub: string): Observable<Blob> {
    return this.http.get(`${this.miembrosUrl}/club/${idClub}/exportar-excel`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.warn('MiembroService.exportarExcel failed (offline), generating mock CSV blob', err);
          const header = 'Nombre,Apellido,Rol / Función,Clase,Unidad,Ficha Salud,Seguro,Adhesión Padres,Estado,Pendientes\n';
          const rows = this.mockMiembros
            .map(m => `"${m.nombre || ''}","${m.apellido || ''}","${m.funcion || ''}","${m.nombreClase || ''}","${m.nombreUnidad || ''}","${m.estadoFichaSalud || ''}","${m.estadoSeguro || ''}","${m.estadoAdhesionPadres || ''}","${m.estado || ''}",${m.pendientes || 0}`)
            .join('\n');
          const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
          return of(blob);
        }
        return throwError(() => err);
      })
    );
  }

  private calculateMockPendientes(miembro: any): number {
    let count = 0;
    if (miembro.estadoFichaSalud === 'PENDIENTE') count++;
    if (miembro.estadoSeguro === 'NO_POSEE_SEGURO') count++;
    if (miembro.estadoAdhesionPadres === 'PENDIENTE') count++;
    return count;
  }
}
