import type { ApiResponse } from '@food-delivery/types';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        status: response.statusCode,
        message,
        data,
      })),
    );
  }
}
