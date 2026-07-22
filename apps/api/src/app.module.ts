import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppCacheModule } from './core/cache/cache.module';
import { DatabaseModule } from './core/database/database.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { AuthModule } from './features/auth/auth.module';
import { DriversModule } from './features/drivers/drivers.module';
import { MenuModule } from './features/menu/menu.module';
import { OrdersModule } from './features/orders/orders.module';
import { PaymentsModule } from './features/payments/payments.module';
import { RestaurantsModule } from './features/restaurants/restaurants.module';
import { UploadsModule } from './features/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AppCacheModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    DriversModule,
    OrdersModule,
    PaymentsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
