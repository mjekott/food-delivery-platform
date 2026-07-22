import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export const PAYMENT_PROVIDER = 'paystack';

interface InitializeParams {
  email: string;
  /** Amount in the smallest currency unit (kobo for NGN). */
  amountKobo: number;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

/** Thin wrapper over the Paystack HTTP API. */
@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  async initializeTransaction(
    params: InitializeParams,
  ): Promise<PaystackInitResult> {
    const json = await this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
      reference: json.data.reference,
    };
  }

  /** Confirms a transaction. Returns true when payment succeeded. */
  async isTransactionPaid(reference: string): Promise<boolean> {
    const json = await this.request<{ status: string }>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: 'GET' },
    );
    return json.data.status === 'success';
  }

  /** Validates a webhook payload's `x-paystack-signature` header. */
  isValidWebhookSignature(rawBody: Buffer, signature?: string): boolean {
    if (!signature || !this.secretKey) return false;
    const expected = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: string },
  ): Promise<PaystackEnvelope<T>> {
    if (!this.secretKey) {
      throw new BadGatewayException(
        'Paystack is not configured (PAYSTACK_SECRET_KEY missing)',
      );
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method,
      body: init.body,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const json = (await response.json()) as PaystackEnvelope<T>;
    if (!response.ok || !json.status) {
      this.logger.error(`Paystack ${path} failed: ${json.message}`);
      throw new BadGatewayException(json.message || 'Paystack request failed');
    }
    return json;
  }
}
