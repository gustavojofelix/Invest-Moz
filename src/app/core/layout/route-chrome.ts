import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Which page chrome a route wants, from `data.chrome` on the deepest active route:
 *
 * - `site` (default): site header, footer and the machine-translation notice
 * - `app`: a full-screen mobile-app screen (welcome, chat, WhatsApp); the page draws its own bar
 * - `office`: the back office; its layout draws the sidebar
 */
export type Chrome = 'site' | 'app' | 'office';

function deepest(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let s = snapshot;
  while (s.firstChild) s = s.firstChild;
  return s;
}

@Injectable({ providedIn: 'root' })
export class RouteChrome {
  private readonly router = inject(Router);

  private read(): Chrome {
    const data = deepest(this.router.routerState.snapshot.root).data;
    const chrome = data['chrome'];
    return chrome === 'app' || chrome === 'office' ? chrome : 'site';
  }

  readonly chrome = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.read()),
    ),
    { initialValue: this.read() },
  );
}
