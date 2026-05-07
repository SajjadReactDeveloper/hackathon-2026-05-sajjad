import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { ExternalAPIError } from '../common/errors';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

@Injectable()
export class WhatsAppService {
  constructor(
    @InjectPinoLogger(WhatsAppService.name) private readonly logger: PinoLogger,
  ) {}

  verifyWebhookSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
    if (!appSecret) return true; // skip in dev when secret not configured
    const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const actual = signature.replace('sha256=', '');
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
    } catch {
      return false;
    }
  }

  async sendText(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<unknown> {
    return this.callMeta(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    });
  }

  async sendAudio(phoneNumberId: string, accessToken: string, to: string, audioUrl: string): Promise<unknown> {
    return this.callMeta(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: { link: audioUrl },
    });
  }

  async sendImage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<unknown> {
    return this.callMeta(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    });
  }

  async verifyCredentials(phoneNumberId: string, accessToken: string): Promise<{ displayPhoneNumber: string; verifiedName: string }> {
    try {
      const { data } = await axios.get<{ display_phone_number: string; verified_name: string }>(
        `${META_API_BASE}/${phoneNumberId}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, params: { fields: 'display_phone_number,verified_name' } },
      );
      return { displayPhoneNumber: data.display_phone_number, verifiedName: data.verified_name };
    } catch (err) {
      const message = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
      throw new ExternalAPIError('WhatsApp', message);
    }
  }

  async downloadMedia(mediaId: string, accessToken: string): Promise<Buffer> {
    const { data: meta } = await axios.get<{ url: string }>(
      `${META_API_BASE}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const { data } = await axios.get<ArrayBuffer>(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(data);
  }

  parseWebhookEvent(body: Record<string, unknown>): {
    phoneNumberId: string;
    from: string;
    waMessageId: string;
    timestamp: number;
    type: string;
    text: { body: string } | undefined;
    audio: { id: string; mime_type: string } | undefined;
    image: { id: string; mime_type: string; caption?: string } | undefined;
    contactName: string | undefined;
  } | null {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const change = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = change?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;
    const message = messages?.[0];
    const contacts = value?.contacts as Array<Record<string, unknown>> | undefined;
    const contact = contacts?.[0];

    if (!message) return null;

    return {
      phoneNumberId: (value?.metadata as Record<string, unknown>)?.phone_number_id as string,
      from: message.from as string,
      waMessageId: message.id as string,
      timestamp: Number(message.timestamp),
      type: message.type as string,
      text: message.text as { body: string } | undefined,
      audio: message.audio as { id: string; mime_type: string } | undefined,
      image: message.image as { id: string; mime_type: string; caption?: string } | undefined,
      contactName: (contact?.profile as Record<string, unknown>)?.name as string | undefined,
    };
  }

  private async callMeta(
    phoneNumberId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const { data } = await axios.post(
        `${META_API_BASE}/${phoneNumberId}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
      );
      return data;
    } catch (err) {
      const message = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
      this.logger.error({ err, phoneNumberId }, 'Meta API error');
      throw new ExternalAPIError('WhatsApp', message);
    }
  }
}
