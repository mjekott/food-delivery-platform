import { UserRole, type AuthUser } from '@food-delivery/types';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ResponseMessage } from '../../core/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriversService } from './drivers.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me/status')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Driver status retrieved')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.driversService.getStatus(user.id);
  }

  // Drivers view their assigned, active orders via `GET /orders?active=true`.
  @Patch('me/status')
  @Roles(UserRole.DRIVER)
  @ResponseMessage('Availability updated')
  setStatus(@CurrentUser() user: AuthUser, @Body() dto: UpdateAvailabilityDto) {
    return this.driversService.setAvailability(user.id, dto.isOnline);
  }
}
