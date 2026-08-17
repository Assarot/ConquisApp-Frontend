import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { DashboardLayoutComponent } from './modules/layout/dashboard-layout/dashboard-layout.component';
import { DashboardHomeComponent } from './modules/dashboard/home/dashboard-home.component';
import { PoaComponent } from './modules/dashboard/poa/poa.component';
import { MiembrosListComponent } from './modules/miembros/miembros-list/miembros-list.component';
import { UnidadesListComponent } from './modules/unidades/unidades-list/unidades-list.component';
import { ClaseDetalleComponent } from './modules/clases/clase-detalle/clase-detalle.component';
import { CronogramaComponent } from './modules/planificacion/cronograma/cronograma.component';
import { SesionesComponent } from './modules/planificacion/sesiones/sesiones.component';
import { CalendarioComponent } from './modules/planificacion/calendario/calendario.component';
import { EspecialidadesComponent } from './modules/especialidades/especialidades.component';
import { AsistenciaComponent } from './modules/avances/asistencia/asistencia.component';
import { AvancesComponent } from './modules/avances/asistencia/avances.component';
import { ReportesComponent } from './modules/reportes/reportes.component';
import { MaterialesComponent } from './modules/materiales/materiales.component';
import { RankingComponent } from './modules/ranking/ranking.component';
import { AdminComponent } from './modules/admin/admin.component';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent, pathMatch: 'full' },
      { path: 'poa', component: PoaComponent },
      { path: 'cronograma', component: CronogramaComponent },
      { path: 'sesiones', component: SesionesComponent },
      { path: 'calendario', component: CalendarioComponent },
      { path: 'miembros', component: MiembrosListComponent },
      { path: 'unidades', component: UnidadesListComponent },
      { path: 'clases', component: ClaseDetalleComponent },
      { path: 'especialidades', component: EspecialidadesComponent },
      { path: 'asistencia', component: AsistenciaComponent },
      { path: 'avances', component: AvancesComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'materiales', component: MaterialesComponent },
      { path: 'ranking', component: RankingComponent },
      { path: 'admin', component: AdminComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
