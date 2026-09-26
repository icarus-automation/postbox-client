import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { ImageContentType, MediaRef, MediaUploadTicket } from '../blog.types';

@Injectable({ providedIn: 'root' })
export class Media {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/media`;

  /**
   * Puts the file on R2, then records it. The upload URL is not the API, so this uses
   * fetch: the credentials interceptor only sees HttpClient, and must not attach the
   * session cookie to storage.
   */
  async upload(file: File, alt: string, contentType: ImageContentType): Promise<MediaRef> {
    const ticket = await firstValueFrom(
      this.http.post<MediaUploadTicket>(`${this.base}/uploads`, {
        contentType,
        byteSize: file.size,
      }),
    );

    const uploaded = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: ticket.headers,
      credentials: 'omit',
    });
    if (!uploaded.ok) {
      throw new Error('Upload failed');
    }

    return firstValueFrom(
      this.http.post<MediaRef>(`${this.base}/confirm`, { storageKey: ticket.storageKey, alt }),
    );
  }
}
