import { UserRole, type AuthUser } from '@food-delivery/types';
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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @Roles(UserRole.RESTAURANT_OWNER)
  @ResponseMessage('Restaurant created')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(user.id, dto);
  }

  @Get()
  @Public()
  @ResponseMessage('Restaurants retrieved')
  findAll(@Query() query: FindRestaurantsQueryDto) {
    return this.restaurantsService.findAll(query);
  }

  // Must be declared before ':id' so "me" isn't matched as an id param.
  @Get('me')
  @Roles(UserRole.RESTAURANT_OWNER)
  @ResponseMessage('Your restaurant retrieved')
  findMine(@CurrentUser() user: AuthUser) {
    return this.restaurantsService.findMine(user.id);
  }

  @Get(':id')
  @ResponseMessage('Restaurant retrieved')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Restaurant updated')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, user, dto);
  }
}
