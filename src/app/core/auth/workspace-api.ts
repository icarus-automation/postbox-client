import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import type { Admission, WorkspaceView } from './auth.types';

export type SlugPreview =
  | { outcome: 'available'; slug: string }
  | { outcome: 'taken'; slug: string }
  | { outcome: 'invalid' };

export type LogoSelection =
  | { kind: 'unchanged' }
  | { kind: 'clear' }
  | { kind: 'file'; file: File };

type Hold = {
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class WorkspaceApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly base = `${environment.apiBaseUrl}/workspaces`;

  previewSlug(raw: string): Promise<SlugPreview> {
    return firstValueFrom(this.http.post<SlugPreview>(`${this.base}/slug-preview`, { slug: raw }));
  }

  async found(input: {
    name: string;
    slug: string;
    website: string;
    logo: File | null;
  }): Promise<Extract<Admission, { phase: 'admitted' }>> {
    const logoHoldKey = input.logo ? await this.upload(input.logo) : null;
    await firstValueFrom(
      this.http.post(`${this.base}`, {
        name: input.name,
        slug: input.slug,
        website: input.website.trim() === '' ? null : input.website.trim(),
        logoHoldKey,
      }),
    );

    const admission = await this.auth.refresh();
    if (admission.phase !== 'admitted') {
      throw new Error('Workspace was not created');
    }
    return admission;
  }

  async save(input: {
    name: string;
    website: string;
    logo: LogoSelection;
  }): Promise<WorkspaceView> {
    const logo =
      input.logo.kind === 'file'
        ? { kind: 'hold' as const, storageKey: await this.upload(input.logo.file) }
        : input.logo.kind === 'clear'
          ? { kind: 'clear' as const }
          : { kind: 'unchanged' as const };

    await firstValueFrom(
      this.http.post(`${this.base}/profile`, {
        name: input.name,
        website: input.website.trim() === '' ? null : input.website.trim(),
        logo,
      }),
    );

    const admission = await this.auth.refresh();
    if (admission.phase !== 'admitted') {
      throw new Error('Workspace was not saved');
    }
    return admission.workspace;
  }

  private async upload(file: File): Promise<string> {
    const hold = await firstValueFrom(
      this.http.post<Hold>(`${this.base}/logo-holds`, {
        contentType: file.type,
        byteSize: file.size,
      }),
    );

    const uploaded = await fetch(hold.uploadUrl, {
      method: 'PUT',
      headers: hold.headers,
      body: file,
      credentials: 'omit',
    });
    if (!uploaded.ok) {
      throw new Error('Logo upload failed');
    }
    return hold.storageKey;
  }
}
