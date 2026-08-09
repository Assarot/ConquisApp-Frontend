import { Component, OnInit, signal } from '@angular/core';
import Swal from 'sweetalert2';

export interface EventoClub {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  tipo: 'CAMPOREE' | 'CAMPAMENTO' | 'REUNION' | 'INVESTIDURA' | 'CIVICO';
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
  showNuevoEventoModal = false;

  nuevoEvento: Partial<EventoClub> = {
    titulo: '',
    fecha: '2026-08-22',
    hora: '14:00',
    lugar: '',
    tipo: 'REUNION',
    descripcion: ''
  };

  eventos = signal<EventoClub[]>([
    {
      id: 'e-1',
      titulo: 'Reunión Regular de Club',
      fecha: '15 Ago 2026',
      hora: '14:00 - 17:30',
      lugar: 'Iglesia Central / Patio',
      tipo: 'REUNION',
      color: '#00113a',
      icono: 'schedule',
      descripcion: 'Apertura, instrucción de clases y rincón de unidad.'
    },
    {
      id: 'e-2',
      titulo: 'Campamento de Instrucción y Supervivencia',
      fecha: '28 - 30 Ago 2026',
      hora: 'Viernes 17:00 a Domingo 16:00',
      lugar: 'Camping Los Pinos - Valle Sagrado',
      tipo: 'CAMPAMENTO',
      color: '#2e7d32',
      icono: 'camping',
      descripcion: 'Pernocta rústica, marcha nocturna y especialidad de pionerismo.'
    },
    {
      id: 'e-3',
      titulo: 'Desfile Cívico y Marchas por Unidades',
      fecha: '05 Sep 2026',
      hora: '09:00 - 12:00',
      lugar: 'Plaza de Armas',
      tipo: 'CIVICO',
      color: '#b7102a',
      icono: 'military_tech',
      descripcion: 'Uniforme de gala completo y banda de marcha.'
    },
    {
      id: 'e-4',
      titulo: 'Gran Camporee Misionero',
      fecha: '18 - 22 Oct 2026',
      hora: '5 Días completos',
      lugar: 'Centro de Convenciones Campestre',
      tipo: 'CAMPOREE',
      color: '#ffba27',
      icono: 'emoji_events',
      descripcion: 'Competencia general de clubes, ferias y música.'
    },
    {
      id: 'e-5',
      titulo: 'Ceremonia Magna de Investidura 2026',
      fecha: '28 Nov 2026',
      hora: '17:00 - 19:30',
      lugar: 'Templo Principal',
      tipo: 'INVESTIDURA',
      color: '#7b1fa2',
      icono: 'verified',
      descripcion: 'Entrega de insignias de clases regulares y especialidades.'
    }
  ]);

  diasMes = [
    { num: 1, esHoy: false, tieneEvento: false },
    { num: 2, esHoy: false, tieneEvento: false },
    { num: 3, esHoy: false, tieneEvento: false },
    { num: 4, esHoy: false, tieneEvento: false },
    { num: 5, esHoy: false, tieneEvento: false },
    { num: 6, esHoy: false, tieneEvento: false },
    { num: 7, esHoy: false, tieneEvento: false },
    { num: 8, esHoy: false, tieneEvento: true, eventoColor: '#00113a' },
    { num: 9, esHoy: false, tieneEvento: false },
    { num: 10, esHoy: false, tieneEvento: false },
    { num: 11, esHoy: false, tieneEvento: false },
    { num: 12, esHoy: false, tieneEvento: false },
    { num: 13, esHoy: false, tieneEvento: false },
    { num: 14, esHoy: false, tieneEvento: false },
    { num: 15, esHoy: true, tieneEvento: true, eventoColor: '#00113a' },
    { num: 16, esHoy: false, tieneEvento: false },
    { num: 17, esHoy: false, tieneEvento: false },
    { num: 18, esHoy: false, tieneEvento: false },
    { num: 19, esHoy: false, tieneEvento: false },
    { num: 20, esHoy: false, tieneEvento: false },
    { num: 21, esHoy: false, tieneEvento: false },
    { num: 22, esHoy: false, tieneEvento: true, eventoColor: '#00113a' },
    { num: 23, esHoy: false, tieneEvento: false },
    { num: 24, esHoy: false, tieneEvento: false },
    { num: 25, esHoy: false, tieneEvento: false },
    { num: 26, esHoy: false, tieneEvento: false },
    { num: 27, esHoy: false, tieneEvento: false },
    { num: 28, esHoy: false, tieneEvento: true, eventoColor: '#2e7d32' },
    { num: 29, esHoy: false, tieneEvento: true, eventoColor: '#2e7d32' },
    { num: 30, esHoy: false, tieneEvento: true, eventoColor: '#2e7d32' },
    { num: 31, esHoy: false, tieneEvento: false }
  ];

  ngOnInit(): void {}

  crearEvento(): void {
    if (!this.nuevoEvento.titulo || !this.nuevoEvento.lugar) {
      Swal.fire('Campos Obligatorios', 'Por favor llena el título y lugar del evento', 'warning');
      return;
    }

    const iconoMap: Record<string, string> = {
      REUNION: 'schedule',
      CAMPAMENTO: 'camping',
      CAMPOREE: 'emoji_events',
      CIVICO: 'military_tech',
      INVESTIDURA: 'verified'
    };

    const colorMap: Record<string, string> = {
      REUNION: '#00113a',
      CAMPAMENTO: '#2e7d32',
      CAMPOREE: '#ffba27',
      CIVICO: '#b7102a',
      INVESTIDURA: '#7b1fa2'
    };

    const tipo = this.nuevoEvento.tipo || 'REUNION';

    const nuevo: EventoClub = {
      id: `e-${Date.now()}`,
      titulo: this.nuevoEvento.titulo || '',
      fecha: this.nuevoEvento.fecha || '',
      hora: this.nuevoEvento.hora || '14:00',
      lugar: this.nuevoEvento.lugar || '',
      tipo: tipo,
      icono: iconoMap[tipo] || 'event',
      color: colorMap[tipo] || '#00113a',
      descripcion: this.nuevoEvento.descripcion || ''
    };

    this.eventos.update(list => [...list, nuevo]);
    this.showNuevoEventoModal = false;
    this.nuevoEvento = {
      titulo: '',
      fecha: '2026-08-22',
      hora: '14:00',
      lugar: '',
      tipo: 'REUNION',
      descripcion: ''
    };

    Swal.fire({
      icon: 'success',
      title: 'Evento Registrado',
      text: 'El evento ha sido publicado en el calendario oficial del club.',
      timer: 1500,
      showConfirmButton: false
    });
  }
}
