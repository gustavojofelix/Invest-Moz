import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from '@core/layout/seo.service';
import { ThemeService } from '@core/layout/theme.service';

@Component({
  selector: 'im-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    inject(SeoService).init();
    inject(ThemeService).init();
  }
}
