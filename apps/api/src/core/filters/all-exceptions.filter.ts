import type { ApiResponse } from '@food-delivery/types';
import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = this.extractMessage(exception.getResponse());
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Unexpected (5xx) errors are worth logging with their stack.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    const body: ApiResponse<null> = { status, message, data: null };
    response.status(status).json(body);
  }

  /** Collapses Nest's error payload (string | { message: string | string[] }) to one message. */
  private extractMessage(payload: string | object): string {
    if (typeof payload === 'string') {
      return payload;
    }

    const message = (payload as { message?: string | string[] }).message;

    if (Array.isArray(message)) {
      return message[0] ?? 'Error';
    }

    return message ?? 'Error';
  }
}
