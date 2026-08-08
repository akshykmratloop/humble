import { BadRequestException } from '@nestjs/common';

/**
 * Wraps a Zod schema as a Nest ParamPipe. This is the security-gate validation
 * required by global CLAUDE.md §6 / docs/06-lld.md §12 — frontend validation is
 * UX only, this pipe is what actually protects every mutating endpoint.
 */
export class ZodValidationPipe {
  constructor(schema) {
    this.schema = schema;
  }

  transform(value) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
        .join('; ');
      throw new BadRequestException(message);
    }
    return result.data;
  }
}
