import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideExternalLink } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { IntegrationKey } from '@core/integration-key/integration-key';
import { environment } from '@env/environment';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { CopyButton } from '@ui/copy-button';
import { HlmSkeleton } from '@ui/skeleton';
import { agentPrompt, guideUrl, quickReference } from './developer-snippets';

/**
 * Everything a developer, or an AI coding agent, needs to connect a website: the key, the
 * address and slug it goes with, one prompt to paste, and a short reference. Owners and admins
 * only, because the key is shown here. The full guide lives on the API.
 */
@Component({
  selector: 'app-developers',
  imports: [
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmSkeleton,
    CopyButton,
  ],
  providers: [provideIcons({ lucideArrowRight, lucideExternalLink })],
  templateUrl: './developers.html',
  host: { class: 'page-standard' },
})
export class Developers {
  private readonly auth = inject(Auth);

  protected readonly key = inject(IntegrationKey).current();
  protected readonly apiBaseUrl = environment.apiBaseUrl;
  protected readonly guideUrl = guideUrl(environment.apiBaseUrl);
  protected readonly slug = computed(() => this.auth.workspace()?.slug ?? '');

  protected readonly prompt = computed(() =>
    agentPrompt({ apiBaseUrl: this.apiBaseUrl, slug: this.slug() }),
  );
  protected readonly reference = computed(() =>
    quickReference({ apiBaseUrl: this.apiBaseUrl, slug: this.slug() }),
  );

  protected readonly errorMessage = computed(() => {
    const error = this.key.error();
    return error ? apiErrorMessage(error, 'Could not load the integration key.') : null;
  });
}
