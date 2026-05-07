import { RulesService } from '../src/rules/rules.service';
import type { AutoRule } from '@repo/db';

const WORKSPACE_ID = 'a0000000-0000-0000-0001-000000000001';

function makeRule(overrides: Partial<AutoRule> = {}): AutoRule {
  return {
    id: 'a0000000-0000-0000-0099-000000000001',
    workspaceId: WORKSPACE_ID,
    name: 'Address request',
    triggerPattern: 'address|city|location',
    matchScope: 'any',
    replyTemplate: 'Please share your full address including city and landmark.',
    action: 'send_text',
    enabled: true,
    priority: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeService(rules: AutoRule[]): RulesService {
  const mockPrisma = {
    autoRule: {
      findMany: jest.fn().mockImplementation(({ where }: { where?: { enabled?: boolean } } = {}) => {
        const filtered = where?.enabled !== undefined ? rules.filter(r => r.enabled === where.enabled) : rules;
        return Promise.resolve(filtered);
      }),
    },
  };
  const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn(), trace: jest.fn(), fatal: jest.fn() };
  return new RulesService(mockPrisma as never, mockLogger as never);
}

describe('RulesService — match()', () => {
  it('matches text against a send_text rule', async () => {
    const service = makeService([makeRule()]);
    const result = await service.match(WORKSPACE_ID, 'meri address kya honi chahiye?');
    expect(result.matched).toBe(true);
    expect(result.action).toBe('send_text');
    expect(result.replyText).toBeTruthy();
  });

  it('matches case-insensitively', async () => {
    const service = makeService([makeRule({ triggerPattern: 'RETURN|WAPAS' })]);
    const result = await service.match(WORKSPACE_ID, 'mujhe wapas karna hai');
    expect(result.matched).toBe(true);
  });

  it('returns matched=false when no rule matches', async () => {
    const service = makeService([makeRule()]);
    const result = await service.match(WORKSPACE_ID, 'shukriya bhai');
    expect(result.matched).toBe(false);
    expect(result.rule).toBeUndefined();
  });

  it('skips disabled rules', async () => {
    const service = makeService([makeRule({ enabled: false })]);
    const result = await service.match(WORKSPACE_ID, 'meri address kya honi chahiye?');
    expect(result.matched).toBe(false);
  });

  it('respects matchScope=text — ignores transcription', async () => {
    const service = makeService([makeRule({ matchScope: 'text' })]);
    // address is in transcription only — should NOT match
    const result = await service.match(WORKSPACE_ID, 'hello', 'please share address');
    expect(result.matched).toBe(false);
  });

  it('respects matchScope=transcription — uses transcription', async () => {
    const service = makeService([makeRule({ matchScope: 'transcription', triggerPattern: 'order|parcel' })]);
    const result = await service.match(WORKSPACE_ID, 'hi', 'mujhe ek order karna hai');
    expect(result.matched).toBe(true);
  });

  it('handles invalid regex gracefully without throwing', async () => {
    const service = makeService([makeRule({ triggerPattern: '[invalid((' }), makeRule({ name: 'Fallback', triggerPattern: 'hello', priority: 0 })]);
    await expect(service.match(WORKSPACE_ID, 'hello world')).resolves.toBeDefined();
  });

  it('fires first rule when multiple match (highest priority wins)', async () => {
    const highPriority = makeRule({ id: 'a0000000-0000-0000-0099-000000000002', name: 'High', priority: 100, action: 'skip_ai', triggerPattern: 'cancel' });
    const lowPriority = makeRule({ id: 'a0000000-0000-0000-0099-000000000003', name: 'Low', priority: 1, action: 'send_text', triggerPattern: 'cancel' });
    const service = makeService([highPriority, lowPriority]);
    const result = await service.match(WORKSPACE_ID, 'I want to cancel');
    expect(result.action).toBe('skip_ai');
  });
});
