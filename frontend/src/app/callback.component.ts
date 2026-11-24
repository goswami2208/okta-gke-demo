import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({ selector: 'app-callback', standalone: true, template: '<p>Signing you in…</p>' })
export class CallbackComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    const target = await this.auth.handleCallback();
    await this.router.navigateByUrl(target);
  }
}
