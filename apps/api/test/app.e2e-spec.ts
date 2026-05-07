import { createHmac } from 'crypto';

// Smoke test: pure Node.js — no NestJS, no env vars, no DB.
// Verifies the HMAC-SHA256 logic used by the webhook controller is correct
// before we even spin up the application.
describe('Webhook HMAC smoke test', () => {
  const secret = 'test-secret-32-bytes-long-pad-xx';

  function sign(body: Buffer): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  it('generates a 64-char hex digest', () => {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const sig = sign(body);
    expect(sig.startsWith('sha256=')).toBe(true);
    expect(sig.slice('sha256='.length)).toHaveLength(64);
  });

  it('same body + same secret → same signature (deterministic)', () => {
    const body = Buffer.from('test payload');
    expect(sign(body)).toBe(sign(body));
  });

  it('different bodies produce different signatures', () => {
    const bodyA = Buffer.from('payload-a');
    const bodyB = Buffer.from('payload-b');
    expect(sign(bodyA)).not.toBe(sign(bodyB));
  });

  it('different secrets produce different signatures', () => {
    const body = Buffer.from('same payload');
    const sig1 = 'sha256=' + createHmac('sha256', 'secret-1').update(body).digest('hex');
    const sig2 = 'sha256=' + createHmac('sha256', 'secret-2').update(body).digest('hex');
    expect(sig1).not.toBe(sig2);
  });
});
