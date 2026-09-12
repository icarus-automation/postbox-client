import { Component } from '@angular/core';
import { HlmButton } from '@ui/button';

/**
 * DELETE ME.
 *
 * Smoke test for a fresh clone: if the tokens, fonts and spartan wiring below
 * all render correctly, the boilerplate is set up. Delete this folder and the
 * welcome route in `app.routes.ts` once your first feature exists.
 */
@Component({
  selector: 'app-welcome',
  imports: [HlmButton],
  templateUrl: './welcome.html',
})
export class Welcome {
  protected readonly swatches = [
    { token: 'bg-primary', class: 'bg-primary' },
    { token: 'bg-secondary', class: 'bg-secondary' },
    { token: 'bg-accent', class: 'bg-accent' },
    { token: 'bg-muted', class: 'bg-muted' },
    { token: 'bg-success', class: 'bg-success' },
    { token: 'bg-destructive', class: 'bg-destructive' },
    { token: 'bg-card', class: 'bg-card' },
    { token: 'border-border', class: 'bg-border' },
  ];

  protected readonly checklist = [
    'package.json: name',
    'angular.json: project key + 2 buildTarget refs',
    'src/index.html: title + description',
    'src/environments/*.ts: apiBaseUrl',
    'src/styles.css: brand tokens',
    'README.md + LICENSE: title, description, copyright',
    'Delete src/app/modules/welcome and its route',
  ];
}
