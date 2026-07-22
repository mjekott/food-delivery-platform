import { OrderStatus, UserRole, type AuthUser } from '@food-delivery/types';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ResponseMessage } from '../../core/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ResponseMessage('Order placed')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Post(':id/pay')
  @Roles(UserRole.CUSTOMER)
  @ResponseMessage('Payment initialized')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.ordersService.initializePayment(user, id, dto.callbackUrl);
  }

  @Post(':id/verify')
  @Roles(UserRole.CUSTOMER)
  @ResponseMessage('Payment verified')
  verify(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.verifyPayment(user, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.CUSTOMER)
  @ResponseMessage('Order cancelled')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelOrder(user, id);
  }

  // Restaurant owners and drivers advance their own step of the order
  // lifecycle; the service enforces which transition each role may perform.
  @Patch(':id/status')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.ADMIN)
  @ResponseMessage('Order status updated')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, dto.status);
  }

  @Patch(':id/assign')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Driver assigned')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(user, id, dto.driverId);
  }

  // ----- Driver actions -----

  @Post(':id/accept')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Order accepted')
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.acceptOrder(user, id);
  }

  @Post(':id/decline')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Order declined')
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.declineOrder(user, id);
  }

  @Post(':id/pickup')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Order picked up')
  pickup(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.updateStatus(user, id, OrderStatus.OUT_FOR_DELIVERY);
  }

  @Post(':id/deliver')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Order delivered')
  deliver(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.updateStatus(user, id, OrderStatus.DELIVERED);
  }

  @Get()
  @ResponseMessage('Orders retrieved')
  findAll(@CurrentUser() user: AuthUser, @Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(user, query);
  }

  // Declared before ':id' so "available" isn't matched as an order id.
  @Get('available')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Available orders retrieved')
  available(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAvailable(query);
  }

  // Literal paths before ':id' so they aren't matched as an order id.
  @Get('analytics')
  @Roles(UserRole.RESTAURANT_OWNER)
  @ResponseMessage('Analytics retrieved')
  analytics(@CurrentUser() user: AuthUser) {
    return this.ordersService.getRestaurantAnalytics(user);
  }

  @Get('driver-stats')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Driver stats retrieved')
  driverStats(@CurrentUser() user: AuthUser) {
    return this.ordersService.getDriverStats(user);
  }

  @Get(':id')
  @ResponseMessage('Order retrieved')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOne(user, id);
  }

  @Get(':id/location')
  @ResponseMessage('Driver location retrieved')
  location(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderLocation(user, id);
  }
}
