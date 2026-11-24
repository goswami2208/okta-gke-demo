import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { ItemsComponent } from './items.component';
import { CallbackComponent } from './callback.component';

export const routes: Routes = [
  { path: 'login/callback', component: CallbackComponent },
  { path: '', component: ItemsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
