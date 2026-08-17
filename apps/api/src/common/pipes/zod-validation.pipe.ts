import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { AppError, ErrorCategory } from '../errors/app-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError(
        'Invalid input',
        ErrorCategory.VALIDATION,
        400,
        'VALIDATION_ERROR',
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }
    return result.data;
  }
}
