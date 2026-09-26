import { Component, input } from '@angular/core';
import { HlmCardImports } from '@ui/card';

/**
 * The centered card every signed-out screen sits in. It supplies the page's only
 * `<main>`, because these screens render outside MainLayout.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [HlmCardImports],
  templateUrl: './auth-shell.html',
})
export class AuthShell {
  readonly heading = input.required<string>();
  readonly description = input('');
}
