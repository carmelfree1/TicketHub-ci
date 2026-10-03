import { AppError } from './AppError.js';

export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION', statusCode = 409, details?: unknown) {
    super(message, statusCode, code, details);
    this.name = 'BusinessError';
  }
}
