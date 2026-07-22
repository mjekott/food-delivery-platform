import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { ResponseMessage } from '../../core/decorators/response-message.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';
import { PaystackService } from './paystack.service';

interface PaystackEvent {
  event: string;
  data: { reference?: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly orders: OrdersService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Webhook received')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !this.paystack.isValidWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as PaystackEvent;
    if (event.event === 'charge.success' && event.data.reference) {
      await this.orders.confirmByReference(event.data.reference);
    }

    return { received: true };
  }
}
