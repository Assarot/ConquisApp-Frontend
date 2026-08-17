export interface Requisito {
  idRequisito: string;
  descripcion: string;
  categoria: string; // e.g. "Amigo", "Compañero", "Explorador", "Pionero", "Excursionista", "Guía"
  idVersionCuadernillo: string;
}

export interface Avance {
  idAvance?: string;
  idMiembro: string;
  idRequisito: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO';
  fechaActualizacion?: string;
  idInstructorResponsable?: string;
  // Extra fields for rendering
  requisito?: Requisito;
}

export interface Asistencia {
  idAsistencia?: string;
  idSesion: string;
  idUsuario: string; // member or leader
  estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO';
  panoleta: boolean;
  biblia: boolean;
  agua: boolean;
  materiales: boolean;
  // Extra display fields
  nombreMiembro?: string;
}

export interface Sesion {
  idSesion?: string;
  idClase: string;
  idInstructor: string;
  fecha: string; // YYYY-MM-DD
  duracion: number; // in minutes
  actividades: string;
  materiales: string;
  evaluacion: string;
}

export interface AsistenciaMasivaRequest {
  idSesion: string;
  asistencias: {
    idUsuario: string;
    estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO';
    panoleta?: boolean;
    biblia?: boolean;
    agua?: boolean;
    materiales?: boolean;
  }[];
}
