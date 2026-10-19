import { Injectable, inject, signal } from '@angular/core';
import { DEMO_CREDENTIALS } from '../../config/demo-credentials';
import { AuthService, type DemoUser } from '../../ports';
import { SafeStorage } from '../safe-storage';

/**
 * DEMO LOGIN — NOT REAL SECURITY. Compares against public demo credentials in
 * the browser and keeps a flag in localStorage. Replaced by real
 * authentication when the backend arrives.
 */
@Injectable()
export class JsonAuthService extends AuthService {
  private readonly storage = inject(SafeStorage);
  private readonly _user = signal<DemoUser | null>(
    this.storage.get<DemoUser | null>('session', null),
  );
  readonly user = this._user.asReadonly();

  async login(email: string, password: string): Promise<boolean> {
    const ok =
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password;
    if (!ok) return false;
    const user = { email: DEMO_CREDENTIALS.email, name: DEMO_CREDENTIALS.displayName };
    this._user.set(user);
    this.storage.set('session', user);
    return true;
  }

  logout(): void {
    this._user.set(null);
    this.storage.remove('session');
  }
}
