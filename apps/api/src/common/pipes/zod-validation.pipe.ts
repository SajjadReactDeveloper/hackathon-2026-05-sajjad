import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ValidationError } from '../errors';

// reason: bridges Zod v3.24 (packages/types) with Zod v3.25 internals; structural duck-type is safe
interface AnyZodSchema {
  safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: { flatten(): { fieldErrors: unknown } } };
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: AnyZodSchema) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }
    return result.data;
  }
}
