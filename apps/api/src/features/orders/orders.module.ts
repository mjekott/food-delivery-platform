import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DriversModule } from '../drivers/drivers.module';
import { PaystackModule } from '../payments/paystack.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { OrdersService } from './orders.service';

@Module({
  imports: [RestaurantsModule, PaystackModule, AuthModule, DriversModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
