import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';

import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { MapViewerComponent } from './map-viewer/map-viewer.component';

const routes: Routes = [
  {
    path: '', component: MapComponent, pathMatch: 'full', canActivate: [AuthGuard]
  },
  { path: 'login', component: LoginComponent },
  { path: 'mapview', component: MapViewerComponent }


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
