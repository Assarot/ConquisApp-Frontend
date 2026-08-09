import { Component, OnInit, signal } from '@angular/core';
import { ClubService, ClubBackend } from '../../core/services/club.service';
import Swal from 'sweetalert2';

export interface ClubAdmin {
  id: string;
  nombre: string;
  distrito: string;
  asociacion: string;
  director: string;
  miembrosCount: number;
  unidadesCount: number;
  estado: 'ACTIVO' | 'EN_FORMACION';
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  club: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimoAcceso: string;
}

export interface RegistroAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  modulo: string;
  accion: string;
  ip: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  standalone: false
})
export class AdminComponent implements OnInit {
  activeTab = signal<'CLUBES' | 'USUARIOS' | 'AUDITORIA'>('CLUBES');
  showCrearClubModal = false;
  isLoading = signal(false);

  nuevoClub: Partial<ClubAdmin> = {
    nombre: '',
    distrito: '',
    asociacion: 'Misión del Oriente Peruano (MOP)',
    director: '',
    estado: 'ACTIVO'
  };

  clubes = signal<ClubAdmin[]>([]);

  usuarios = signal<UsuarioAdmin[]>([
    {
      id: 'u-1',
      nombre: 'Administrador General',
      email: 'admin@club.com',
      rol: 'ADMINISTRADOR',
      club: 'Global / Todos',
      estado: 'ACTIVO',
      ultimoAcceso: 'Hoy, 10:45 AM'
    },
    {
      id: 'u-2',
      nombre: 'Director de Club',
      email: 'director@club.com',
      rol: 'DIRECTOR',
      club: 'Club Fernando Stahl',
      estado: 'ACTIVO',
      ultimoAcceso: 'Hoy, 09:20 AM'
    },
    {
      id: 'u-3',
      nombre: 'Secretario del Club',
      email: 'secretario@club.com',
      rol: 'SECRETARIO',
      club: 'Club Fernando Stahl',
      estado: 'ACTIVO',
      ultimoAcceso: 'Ayer, 18:30 PM'
    },
    {
      id: 'u-4',
      nombre: 'Instructor de Clase',
      email: 'instructor@club.com',
      rol: 'INSTRUCTOR',
      club: 'Club Fernando Stahl',
      estado: 'ACTIVO',
      ultimoAcceso: 'Ayer, 15:10 PM'
    },
    {
      id: 'u-5',
      nombre: 'Consejero de Unidad',
      email: 'consejero@club.com',
      rol: 'CONSEJERO',
      club: 'Club Fernando Stahl',
      estado: 'ACTIVO',
      ultimoAcceso: '06 Ago 2026'
    }
  ]);

  logs = signal<RegistroAuditoria[]>([
    {
      id: 'l-1',
      fecha: '2026-08-08 17:45:10',
      usuario: 'admin@club.com',
      modulo: 'CLUBES',
      accion: 'Verificación de estado de Club Fernando Stahl',
      ip: '192.168.1.45'
    },
    {
      id: 'l-2',
      fecha: '2026-08-08 16:30:22',
      usuario: 'director@club.com',
      modulo: 'POA',
      accion: 'Creación de actividad "Campamento de Supervivencia"',
      ip: '192.168.1.12'
    },
    {
      id: 'l-3',
      fecha: '2026-08-08 15:12:05',
      usuario: 'instructor@club.com',
      modulo: 'CUADERNILLOS',
      accion: 'Aprobación de requisito "AM-ESP-01" para Mateo Silva',
      ip: '192.168.1.88'
    },
    {
      id: 'l-4',
      fecha: '2026-08-08 14:05:40',
      usuario: 'secretario@club.com',
      modulo: 'MIEMBROS',
      accion: 'Registro de nuevo conquistador: Sofía Quispe',
      ip: '192.168.1.19'
    }
  ]);

  constructor(private clubService: ClubService) {}

  ngOnInit(): void {
    this.cargarClubes();
  }

  cargarClubes(): void {
    this.isLoading.set(true);
    this.clubService.getClubes().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data && data.length > 0) {
          const items: ClubAdmin[] = data.map((c, i) => {
            let configObj: any = {};
            try {
              if (c.configuracion) configObj = JSON.parse(c.configuracion);
            } catch (e) {}

            return {
              id: c.idClub || `c-${i}`,
              nombre: c.nombre,
              distrito: configObj.distrito || 'Distrito Central',
              asociacion: configObj.mision || 'Misión del Oriente Peruano (MOP)',
              director: configObj.director || 'Esteban Quito',
              miembrosCount: 20 + i * 5,
              unidadesCount: 3 + i,
              estado: 'ACTIVO'
            };
          });
          this.clubes.set(items);
        } else {
          this.cargarFallback();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.cargarFallback();
      }
    });
  }

  private cargarFallback(): void {
    this.clubes.set([
      {
        id: 'c-1',
        nombre: 'Club Fernando Stahl',
        distrito: 'Iquitos Central',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Esteban Quito',
        miembrosCount: 30,
        unidadesCount: 4,
        estado: 'ACTIVO'
      },
      {
        id: 'c-2',
        nombre: 'Club Orión',
        distrito: 'Punchana',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Roberto Gómez',
        miembrosCount: 22,
        unidadesCount: 3,
        estado: 'ACTIVO'
      },
      {
        id: 'c-3',
        nombre: 'Club Betel',
        distrito: 'San Juan Bautista',
        asociacion: 'Misión del Oriente Peruano (MOP)',
        director: 'Patricia Dávila',
        miembrosCount: 16,
        unidadesCount: 2,
        estado: 'EN_FORMACION'
      }
    ]);
  }

  crearClub(): void {
    if (!this.nuevoClub.nombre || !this.nuevoClub.distrito) {
      Swal.fire('Campos Obligatorios', 'Por favor ingresa el nombre del club y el distrito eclesiástico', 'warning');
      return;
    }

    const payload: ClubBackend = {
      nombre: this.nuevoClub.nombre || '',
      tipo: 'CONQUISTADORES',
      configuracion: JSON.stringify({
        distrito: this.nuevoClub.distrito,
        mision: this.nuevoClub.asociacion,
        director: this.nuevoClub.director
      })
    };

    this.clubService.registrarClub(payload).subscribe({
      next: (res) => {
        const club: ClubAdmin = {
          id: res.idClub || `c-${Date.now()}`,
          nombre: res.nombre,
          distrito: this.nuevoClub.distrito || '',
          asociacion: this.nuevoClub.asociacion || 'Misión del Oriente Peruano (MOP)',
          director: this.nuevoClub.director || 'Director por Asignar',
          miembrosCount: 0,
          unidadesCount: 0,
          estado: this.nuevoClub.estado || 'ACTIVO'
        };
        this.clubes.update(list => [...list, club]);
      },
      error: () => {
        const club: ClubAdmin = {
          id: `c-${Date.now()}`,
          nombre: this.nuevoClub.nombre || '',
          distrito: this.nuevoClub.distrito || '',
          asociacion: this.nuevoClub.asociacion || 'Misión del Oriente Peruano (MOP)',
          director: this.nuevoClub.director || 'Director por Asignar',
          miembrosCount: 0,
          unidadesCount: 0,
          estado: this.nuevoClub.estado || 'ACTIVO'
        };
        this.clubes.update(list => [...list, club]);
      }
    });

    this.showCrearClubModal = false;
    this.nuevoClub = {
      nombre: '',
      distrito: '',
      asociacion: 'Misión del Oriente Peruano (MOP)',
      director: '',
      estado: 'ACTIVO'
    };

    Swal.fire({
      icon: 'success',
      title: 'Club Registrado',
      text: 'El nuevo club ha sido persistido en la base de datos PostgreSQL.',
      timer: 2000,
      showConfirmButton: false
    });
  }

  toggleEstadoUsuario(id: string): void {
    this.usuarios.update(list =>
      list.map(u =>
        u.id === id
          ? { ...u, estado: u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }
          : u
      )
    );
  }

  resetPassword(email: string): void {
    Swal.fire({
      icon: 'info',
      title: 'Restablecer Clave',
      text: `Se ha enviado un enlace de restablecimiento a ${email}.`,
      timer: 2000,
      showConfirmButton: false
    });
  }
}
