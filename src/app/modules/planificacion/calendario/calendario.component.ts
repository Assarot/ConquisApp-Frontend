import { Component, OnInit, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { PoaService } from '../../../core/services/poa.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActividadPoa, Poa } from '../../../core/models/poa.model';

export interface EventoClub {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  tipo: string;
  color: string;
  icono: string;
  descripcion: string;
}

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  standalone: false
})
export class CalendarioComponent implements OnInit {
  mesActual = signal('Agosto 2026');
  diasMes: any[] = [];
  actividadesPoa: ActividadPoa[] = [];
  clubId = '';
  poaActivoId = '';
  fechaSeleccionada = new Date(2026, 7, 17); // Inicializar en Agosto 2026

  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private poaService: PoaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    console.log('CalendarioComponent: usuario actual obtenido de AuthService:', user);
    
    // Obtener clubId de la sesión de Auth, o por defecto '1'
    this.clubId = user?.idClub?.toString() || '1';
    console.log('CalendarioComponent: clubId final asignado:', this.clubId);
    this.cargarActividadesPoa();
  }

  cargarActividadesPoa(): void {
    console.log('CalendarioComponent: Cargando POAs para club:', this.clubId);
    this.poaService.getPoasByClub(this.clubId).subscribe({
      next: (poas: Poa[]) => {
        console.log('CalendarioComponent: POAs retornados por backend:', poas);
        // Buscar el POA activo, o en su defecto el más reciente por año
        const poaActivo = poas.find(p => p.estado === 'ACTIVO') || 
                          [...poas].sort((a, b) => b.anio - a.anio)[0];
        
        console.log('CalendarioComponent: POA seleccionado para mostrar:', poaActivo);
        if (poaActivo?.idPoa) {
          this.poaActivoId = poaActivo.idPoa;
          this.poaService.getActividades(poaActivo.idPoa).subscribe({
            next: (acts: ActividadPoa[]) => {
              console.log('CalendarioComponent: Actividades cargadas desde backend:', acts);
              this.actividadesPoa = acts || [];
              this.generarCalendario();
            },
            error: (err) => {
              console.error('CalendarioComponent: Error cargando actividades:', err);
              this.generarCalendario();
            }
          });
        } else {
          console.warn('CalendarioComponent: No se encontró ningún POA activo o reciente');
          this.generarCalendario();
        }
      },
      error: (err) => {
        console.error('CalendarioComponent: Error cargando POAs:', err);
        this.generarCalendario();
      }
    });
  }

  generarCalendario(): void {
    const anio = this.fechaSeleccionada.getFullYear();
    const mes = this.fechaSeleccionada.getMonth(); // 0-indexed

    this.mesActual.set(`${this.meses[mes]} ${anio}`);

    // Primer día del mes
    const primerDia = new Date(anio, mes, 1);
    // Día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
    const diaSemanaInicio = primerDia.getDay();

    // Total de días del mes actual
    const totalDias = new Date(anio, mes + 1, 0).getDate();

    // Total de días del mes anterior
    const totalDiasMesAnterior = new Date(anio, mes, 0).getDate();

    const dias = [];

    // 1. Relleno del mes anterior (grisados/desactivados)
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      dias.push({
        num: totalDiasMesAnterior - i,
        esMesActual: false,
        fechaCompleta: '',
        esHoy: false,
        tieneEvento: false,
        eventosDia: []
      });
    }

    // 2. Días del mes actual
    const hoy = new Date();
    for (let i = 1; i <= totalDias; i++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const esHoy = hoy.getDate() === i && hoy.getMonth() === mes && hoy.getFullYear() === anio;
      const eventosDia = this.obtenerEventosParaFecha(fechaStr);

      dias.push({
        num: i,
        esMesActual: true,
        fechaCompleta: fechaStr,
        esHoy: esHoy,
        tieneEvento: eventosDia.length > 0,
        eventoColor: eventosDia.length > 0 ? eventosDia[0].color : '',
        eventosDia: eventosDia
      });
    }

    // 3. Relleno del mes siguiente
    const totalCeldas = 42; // cuadrícula estándar de 6 semanas
    const celdasFaltantes = totalCeldas - dias.length;
    for (let i = 1; i <= celdasFaltantes; i++) {
      dias.push({
        num: i,
        esMesActual: false,
        fechaCompleta: '',
        esHoy: false,
        tieneEvento: false,
        eventosDia: []
      });
    }

    this.diasMes = dias;
  }

  obtenerEventosParaFecha(fechaStr: string): EventoClub[] {
    return this.actividadesPoa.filter(act => {
      if (!act.fecha) return false;
      const start = act.fecha;
      const end = act.fechaFin || act.fecha;
      return fechaStr >= start && fechaStr <= end;
    }).map(act => this.mapearActividadAEvento(act));
  }

  mapearActividadAEvento(act: ActividadPoa): EventoClub {
    const tipoMap: Record<string, string> = {
      CLUB: 'Club',
      IGLESIA: 'Iglesia',
      REGION: 'Región',
      ASOCIACION: 'Asociación',
      RECURRENTE: 'Recurrente'
    };

    const iconoMap: Record<string, string> = {
      CLUB: 'schedule',
      IGLESIA: 'verified',
      REGION: 'military_tech',
      ASOCIACION: 'emoji_events',
      RECURRENTE: 'autorenew'
    };

    const colorMap: Record<string, string> = {
      CLUB: '#00113a',
      IGLESIA: '#7b1fa2',
      REGION: '#b7102a',
      ASOCIACION: '#ffba27',
      RECURRENTE: '#2e7d32'
    };

    const tipo = tipoMap[act.ambito] || 'Otro';
    const icono = iconoMap[act.ambito] || 'event';
    const color = colorMap[act.ambito] || '#444650';

    return {
      id: act.idActividad || '',
      titulo: act.nombre,
      fecha: act.fecha,
      hora: act.responsable || 'Sin asignar',
      lugar: act.lugar || 'Sin asignar',
      tipo: tipo,
      color: color,
      icono: icono,
      descripcion: `Responsable: ${act.responsable || 'No asignado'}`
    };
  }

  mesAnterior(): void {
    this.fechaSeleccionada.setMonth(this.fechaSeleccionada.getMonth() - 1);
    this.fechaSeleccionada = new Date(this.fechaSeleccionada);
    this.generarCalendario();
  }

  mesSiguiente(): void {
    this.fechaSeleccionada.setMonth(this.fechaSeleccionada.getMonth() + 1);
    this.fechaSeleccionada = new Date(this.fechaSeleccionada);
    this.generarCalendario();
  }

  get proximosEventos(): EventoClub[] {
    const anio = this.fechaSeleccionada.getFullYear();
    const mes = this.fechaSeleccionada.getMonth();
    const hoy = new Date();
    
    let limiteStr = '';
    
    const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();
    const esMesPasado = (anio < hoy.getFullYear()) || (anio === hoy.getFullYear() && mes < hoy.getMonth());
    
    if (esMesActual) {
      // Filtrar a partir de hoy (excluyendo días pasados del mes actual)
      limiteStr = hoy.toISOString().substring(0, 10);
    } else {
      // Para meses futuros (o pasados completos), mostrar a partir del día 1 de ese mes
      limiteStr = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
    }

    return this.actividadesPoa
      .filter(act => {
        const dateLimit = act.fechaFin || act.fecha;
        return dateLimit >= limiteStr;
      })
      .map(act => this.mapearActividadAEvento(act))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);
  }

  seleccionarDia(dia: any): void {
    if (!dia.tieneEvento || !dia.eventosDia || dia.eventosDia.length === 0) return;
    
    const eventsHtml = dia.eventosDia.map((ev: EventoClub) => `
      <div class="text-left border-l-4 p-3 rounded bg-slate-900 text-slate-100 space-y-1 mb-2" style="border-color: ${ev.color}">
        <div class="font-bold text-sm text-[#ffba27]">${ev.titulo}</div>
        <div class="text-xs">📍 Lugar: ${ev.lugar}</div>
        <div class="text-xs">👤 Responsable: ${ev.hora}</div>
      </div>
    `).join('');

    Swal.fire({
      title: `Eventos del día ${dia.num}`,
      html: `<div class="space-y-2 max-h-60 overflow-y-auto">${eventsHtml}</div>`,
      icon: 'info',
      background: '#111827',
      color: '#f3f4f6',
      confirmButtonColor: '#00113a'
    });
  }
}
