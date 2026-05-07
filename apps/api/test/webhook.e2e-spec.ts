import { createHmac } from 'crypto';
import { WhatsAppService } from '../src/whatsapp/whatsapp.service';

describe('Webhook signature verification', () => {
  let service: WhatsAppService;
  const appSecret = 'test-app-secret-32bytes-long-xxxx';

  beforeAll(() => {
    // Instantiate without NestJS DI since verifyWebhookSignature has no DB deps
    service = new WhatsAppService({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn(), fatal: jest.fn() } as never);
  });

  function makeSignature(body: Buffer, secret: string) {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  it('returns true when signature matches raw body', () => {
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const sig = makeSignature(body, appSecret);
    expect(service.verifyWebhookSignature(body, sig, appSecret)).toBe(true);
  });

  it('returns false when signature is tampered', () => {
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const sig = 'sha256=deadbeef0000000000000000000000000000000000000000000000000000dead';
    expect(service.verifyWebhookSignature(body, sig, appSecret)).toBe(false);
  });

  it('returns false when signature has wrong length', () => {
    const body = Buffer.from('{}');
    expect(service.verifyWebhookSignature(body, 'sha256=tooshort', appSecret)).toBe(false);
  });

  it('returns true when appSecret is empty (dev mode — skip check)', () => {
    const body = Buffer.from('{}');
    expect(service.verifyWebhookSignature(body, 'sha256=anything', '')).toBe(true);
  });
});
