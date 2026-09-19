import { Component, input } from '@angular/core';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmCardImports } from '@ui/card';

/**
 * The centered card every signed-out screen sits in. It supplies the page's only
 * `<main>`, because these screens render outside MainLayout, and it keeps sign in and
 * sign up on the same Google treatment.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [HlmBadge, HlmButton, HlmCardImports],
  templateUrl: './auth-shell.html',
})
export class AuthShell {
  readonly heading = input.required<string>();
  readonly description = input('');
}
