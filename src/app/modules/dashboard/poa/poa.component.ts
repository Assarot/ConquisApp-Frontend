import { Component, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PoaService } from '../../../core/services/poa.service';
import { AuthService } from '../../../core/services/auth.service';
import { Poa, ActividadPoa } from '../../../core/models/poa.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-poa',
  templateUrl: './poa.component.html',
  standalone: false
})
export class PoaComponent implements OnInit {
  poas: Poa[] = [];
  selectedPoa: Poa | null = null;
  actividades: ActividadPoa[] = [];
  isLoading = false;

  // Forms
  activityForm: FormGroup;
  poaForm: FormGroup;

  // Modals visibility toggles
  showActivityModal = false;
  showPoaModal = false;

  // Permission helper using auth signals
  currentUser = computed(() => this.authService.currentUser());
  canManagePoa = computed(() => {
    const rawRol = this.currentUser()?.rol;
    const role = typeof rawRol === 'string' ? rawRol : (rawRol as any)?.nombre;
    return role === 'ADMINISTRADOR' || role === 'DIRECTOR' || role === 'SECRETARIO' || role === 'DIRECTOR_ASOCIADO';
  });

  constructor(
    private poaService: PoaService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      nombre: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      ambito: ['CLUB', [Validators.required]],
      responsable: ['', [Validators.required]]
    });

    this.poaForm = this.fb.group({
      anio: [new Date().getFullYear() + 1, [Validators.required, Validators.min(2020), Validators.max(2100)]]
    });
  }

  ngOnInit(): void {
    this.loadPoas();
  }

  loadPoas(): void {
    const clubId = this.currentUser()?.idClub?.toString() || '1';
    this.isLoading = true;
    this.poaService.getPoasByClub(clubId).subscribe({
      next: (poas) => {
        this.poas = poas;
        // Select active or latest POA
        const active = poas.find(p => p.estado === 'ACTIVO') || poas[0];
        if (active) {
          this.selectPoa(active);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  selectPoa(poa: Poa): void {
    this.selectedPoa = poa;
    this.isLoading = true;
    this.poaService.getActividades(poa.idPoa).subscribe({
      next: (acts) => {
        this.actividades = acts;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openNewPoaModal(): void {
    this.showPoaModal = true;
  }

  closeNewPoaModal(): void {
    this.showPoaModal = false;
    this.poaForm.reset({ anio: new Date().getFullYear() + 1 });
  }

  onCreatePoa(): void {
    if (this.poaForm.invalid) return;
    const { anio } = this.poaForm.value;
    const clubId = this.currentUser()?.idClub?.toString() || '1';

    this.poaService.inicializarPoa(clubId, anio).subscribe({
      next: (newPoa) => {
        this.closeNewPoaModal();
        Swal.fire({
          title: 'POA Inicializado',
          text: `El Plan Operativo Anual para el año ${anio} ha sido creado.`,
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        this.loadPoas();
      }
    });
  }

  openActivityModal(): void {
    this.showActivityModal = true;
  }

  closeActivityModal(): void {
    this.showActivityModal = false;
    this.activityForm.reset({ ambito: 'CLUB' });
  }

  onAddActivity(): void {
    if (this.activityForm.invalid || !this.selectedPoa) return;

    this.poaService.addActividad(this.selectedPoa.idPoa, this.activityForm.value).subscribe({
      next: (newAct) => {
        this.closeActivityModal();
        Swal.fire({
          title: 'Actividad Agregada',
          text: 'La actividad se ha planificado con éxito.',
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6'
        });
        // Refresh list
        this.selectPoa(this.selectedPoa!);
      }
    });
  }

  onReprogramDate(actividad: ActividadPoa): void {
    if (!this.canManagePoa()) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'Solo directores o secretarios pueden reprogramar actividades.',
        icon: 'warning',
        background: '#111827',
        color: '#f3f4f6'
      });
      return;
    }

    Swal.fire({
      title: 'Reprogramar Actividad',
      html: `<input type="date" id="swal-input-date" class="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white" value="${actividad.fecha}">`,
      focusConfirm: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Guardar Nueva Fecha',
      confirmButtonColor: '#eab308',
      background: '#111827',
      color: '#f3f4f6',
      preConfirm: () => {
        const input = document.getElementById('swal-input-date') as HTMLInputElement;
        return input.value;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.poaService.reprogramarActividad(actividad.idActividad!, result.value).subscribe({
          next: () => {
            Swal.fire({
              title: 'Fecha Actualizada',
              text: 'Sincronizando cronogramas automáticamente.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false,
              background: '#111827',
              color: '#f3f4f6'
            });
            this.selectPoa(this.selectedPoa!);
          }
        });
      }
    });
  }
}
