import { Injectable } from '@angular/core';
import { OktaAuth } from '@okta/okta-auth-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly okta = new OktaAuth({
    issuer: environment.okta.issuer,
    clientId: environment.okta.clientId,
    redirectUri: window.location.origin + '/login/callback',
    scopes: ['openid', 'profile', 'email'],
    pkce: true,                         // Authorization Code + PKCE, no client secret in the browser
  });

  isAuthenticated(): Promise<boolean> {
    return this.okta.isAuthenticated();
  }

  login(originalUri = '/'): Promise<void> {
    return this.okta.signInWithRedirect({ originalUri });
  }

  /** Called on /login/callback: exchanges the code for tokens, returns the page to go back to. */
  async handleCallback(): Promise<string> {
    await this.okta.handleLoginRedirect();
    return this.okta.getOriginalUri() ?? '/';
  }

  accessToken(): string | undefined {
    return this.okta.getAccessToken();
  }

  async userName(): Promise<string> {
    const u = await this.okta.getUser();
    return u.name ?? u.email ?? '';
  }

  logout(): Promise<void> {
    return this.okta.signOut({ postLogoutRedirectUri: window.location.origin });
  }
}
