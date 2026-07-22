import { UserRole, type AuthUser } from '@food-delivery/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ResponseMessage } from '../../core/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuService } from './menu.service';

@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Public()
  @ResponseMessage('Menu retrieved')
  getMenu(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.menuService.getMenu(restaurantId);
  }

  // ----- Categories -----

  @Post('categories')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu category created')
  createCategory(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(restaurantId, user, dto);
  }

  @Patch('categories/:categoryId')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu category updated')
  updateCategory(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(restaurantId, categoryId, user, dto);
  }

  @Delete('categories/:categoryId')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu category deleted')
  removeCategory(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menuService.removeCategory(restaurantId, categoryId, user);
  }

  // ----- Items -----

  @Post('items')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu item created')
  createItem(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.createItem(restaurantId, user, dto);
  }

  @Patch('items/:itemId')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu item updated')
  updateItem(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(restaurantId, itemId, user, dto);
  }

  @Delete('items/:itemId')
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  @ResponseMessage('Menu item deleted')
  removeItem(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.menuService.removeItem(restaurantId, itemId, user);
  }
}
