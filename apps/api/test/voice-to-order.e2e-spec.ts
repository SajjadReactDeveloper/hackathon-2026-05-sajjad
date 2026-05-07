import { z } from 'zod';

// ParsedOrderSchema — the core Zod schema used by VoiceParserService.
// Tests here validate the schema contract without touching external APIs or env vars.
const ParsedOrderSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().optional(),
    }),
  ),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

describe('Voice → Order — ParsedOrderSchema', () => {
  it('accepts valid order with items + address', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [
        { name: 'Lawn suit blue', quantity: 2, unitPriceCents: 350000 },
        { name: 'Dupatta white', quantity: 1 },
      ],
      deliveryAddress: 'DHA Phase 5, Karachi',
    });
    expect(result.success).toBe(true);
  });

  it('accepts missing unitPriceCents (customer did not mention price)', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [{ name: 'Kameez black', quantity: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [{ name: 'Shalwar', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [{ name: 'Shirt', quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing items array', () => {
    expect(ParsedOrderSchema.safeParse({ deliveryAddress: 'Lahore' }).success).toBe(false);
  });

  it('parses the demo transcript output (3 kameez with address)', () => {
    // Simulates what Groq returns for:
    // "teen kameez chahiye, do white aur ek black, DHA Phase 5 Karachi"
    const groqOutput = {
      items: [
        { name: 'Kameez white', quantity: 2 },
        { name: 'Kameez black', quantity: 1 },
      ],
      deliveryAddress: 'DHA Phase 5, Karachi',
    };
    const result = ParsedOrderSchema.safeParse(groqOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0]?.quantity).toBe(2);
      expect(result.data.deliveryAddress).toContain('DHA');
    }
  });

  it('accepts notes field', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [{ name: 'Kurta', quantity: 1 }],
      notes: 'Gift wrapping please',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer quantity', () => {
    const result = ParsedOrderSchema.safeParse({
      items: [{ name: 'Shirt', quantity: 1.5 }],
    });
    expect(result.success).toBe(false);
  });
});
