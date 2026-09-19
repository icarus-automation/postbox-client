import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@ui/sonner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToaster],
  // One toaster for the app. A confirmation is a moment, so it says its piece and goes,
  // rather than taking a line on the page that set it off. Failures stay on the page, in
  // an alert beside the control that failed, because they need reading and retrying.
  template: `
    <router-outlet />
    <hlm-toaster />
  `,
})
export class App {}
