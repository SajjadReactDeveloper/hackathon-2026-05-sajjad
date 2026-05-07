import { FraudScoreService } from '../src/ai/fraud-score.service';

const WORKSPACE_ID = 'a0000000-0000-0000-0001-000000000001';
const CONTACT_ID   = 'a0000000-0000-0000-0002-000000000001';

function makeService({ previousOrders = 0, recentOrders = 0 } = {}): FraudScoreService {
  const mockPrisma = {
    order: {
      count: jest.fn()
        .mockResolvedValueOnce(previousOrders) // first call: total previous orders
        .mockResolvedValueOnce(recentOrders),   // second call: recent 24h orders
    },
  };
  return new FraudScoreService(mockPrisma as never);
}

describe('FraudScoreService — scoreOrder()', () => {
  it('new contact gets +30 (no order history)', async () => {
    const svc = makeService({ previousOrders: 0 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 150_000n, 'DHA Phase 5, Lahore near LGS School');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.signals).toContain('New contact — no order history');
  });

  it('high value order > PKR 5,000 gets +20', async () => {
    const svc = makeService({ previousOrders: 1 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 600_000n, 'DHA Phase 5, Lahore near LGS School');
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.signals).toContain('High order value (> PKR 5,000)');
  });

  it('vague address gets +20', async () => {
    const svc = makeService({ previousOrders: 1 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 100_000n, 'Karachi');
    expect(result.signals).toContain('Vague or missing delivery address');
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('missing address gets +20', async () => {
    const svc = makeService({ previousOrders: 1 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 100_000n, null);
    expect(result.signals).toContain('Vague or missing delivery address');
  });

  it('multiple recent orders in 24h gets +15', async () => {
    const svc = makeService({ previousOrders: 3, recentOrders: 2 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 100_000n, 'DHA Phase 5, Lahore, 100m from Toyota showroom');
    expect(result.signals).toContain('Multiple orders in last 24 hours');
  });

  it('clean order: returning customer, normal value, good address → low score', async () => {
    const svc = makeService({ previousOrders: 5, recentOrders: 0 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 250_000n, 'Flat 4B, Al-Habib Tower, Gulshan-e-Iqbal, Karachi');
    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it('worst case: all signals fire → score capped at 100', async () => {
    const svc = makeService({ previousOrders: 0, recentOrders: 3 });
    const result = await svc.scoreOrder(CONTACT_ID, WORKSPACE_ID, 600_000n, 'x');
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.signals.length).toBeGreaterThanOrEqual(3);
  });
});
