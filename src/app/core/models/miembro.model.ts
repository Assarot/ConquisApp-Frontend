export interface Miembro {
  idMiembro: string;
  nombre: string;
  apellido: string;
  funcion: string; // INSTRUCTOR, CONQUISTADOR, CONSEJERO, etc.
  estado: 'ACTIVO' | 'INACTIVO';
  estadoFichaSalud: 'ACTUALIZADA' | 'PENDIENTE';
  estadoSeguro: 'POSEE_SEGURO' | 'NO_POSEE_SEGURO';
  estadoAdhesionPadres: 'FIRMADA' | 'PENDIENTE';
  pendientes: number; // calculated administrative pending elements (or requirement count)
  idClub: string;
  idUnidad?: string;
  idClase?: string;
  nombreUnidad?: string;
  nombreClase?: string;
}

export interface HistorialUnidad {
  idMiembro: string;
  idUnidadOrigen: string;
  idUnidadDestino: string;
  fechaCambio: string;
}

export interface HistorialAcademico {
  idMiembro: string;
  idClase: string;
  anio: number;
  especialidadesObtenidas: string;
  requisitosCompletados: string;
  asistenciaResumen: string;
}
