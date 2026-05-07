import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../common/env';
import { ExternalAPIError } from '../common/errors';

@Injectable()
export class SupabaseStorageService {
  private readonly client: SupabaseClient;

  constructor(
    @InjectPinoLogger(SupabaseStorageService.name) private readonly logger: PinoLogger,
  ) {
    // Pass ws as the WebSocket transport so this works on Node.js < 22.
    // The API only uses Supabase for Storage — Realtime stays on the browser side.
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
    });
  }

  async upload(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      this.logger.error({ error, bucket, path }, 'Storage upload failed');
      throw new ExternalAPIError('Supabase Storage', error.message);
    }

    return path;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 604800): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      this.logger.error({ error, bucket, path }, 'Signed URL generation failed');
      throw new ExternalAPIError('Supabase Storage', error?.message ?? 'No URL returned');
    }

    return data.signedUrl;
  }

  async uploadAndSign(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
    expiresIn = 604800,
  ): Promise<string> {
    await this.upload(bucket, path, buffer, contentType);
    return this.getSignedUrl(bucket, path, expiresIn);
  }
}
