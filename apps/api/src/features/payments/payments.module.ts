import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaystackModule } from './paystack.module';

@Module({
  imports: [PaystackModule, OrdersModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
