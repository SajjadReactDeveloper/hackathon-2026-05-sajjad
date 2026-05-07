import type { ToolRegistry } from './tool-registry';
import { GetDeliveryInfoArgsSchema } from '@repo/types';

export function registerDeliveryTools(registry: ToolRegistry): void {
  registry.register({
    name: 'get_delivery_info',
    description: 'USE THIS WHEN: customer asks about delivery, shipping times, areas we cover, or delivery charges.',
    schema: GetDeliveryInfoArgsSchema,
    handler: async (args: unknown) => {
      const { city } = GetDeliveryInfoArgsSchema.parse(args);
      const majorCities = ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'peshawar', 'quetta', 'multan'];
      const cityLower = city?.toLowerCase() ?? '';
      const isMajor = majorCities.some((c) => cityLower.includes(c));

      if (!city) {
        return {
          coverage: 'Nationwide delivery across Pakistan',
          standard: '3-5 business days',
          express: '1-2 business days in major cities',
          charges: 'Standard: 200 PKR | Express: 350 PKR',
        };
      }

      return {
        city,
        available: true,
        estimatedDays: isMajor ? '1-2 business days' : '3-5 business days',
        charges: isMajor ? '200 PKR (standard) | 350 PKR (express)' : '250 PKR (standard only)',
      };
    },
  });
}
