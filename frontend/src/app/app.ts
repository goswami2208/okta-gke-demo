import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header style="display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #ccc">
      <strong>Items</strong>
      @if (user()) {
        <span>{{ user() }} <button (click)="auth.logout()">Logout</button></span>
      }
    </header>
    <main style="padding:16px"><router-outlet /></main>
  `,
})
export class App {
  auth = inject(AuthService);
  user = signal('');

  constructor() {
    this.auth.isAuthenticated().then(async ok => ok && this.user.set(await this.auth.userName()));
  }
}
