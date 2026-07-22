import { UserRole, type AuthUser } from '@food-delivery/types';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import {
  menuCategories,
  menuItems,
  type MenuCategory,
  type MenuItem,
  type NewMenuItem,
} from '../../core/database/schema/menu';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

export type MenuCategoryWithItems = MenuCategory & { items: MenuItem[] };

@Injectable()
export class MenuService {
  constructor(
    private readonly database: DatabaseService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  // ----- Public menu view -----

  async getMenu(restaurantId: string): Promise<MenuCategoryWithItems[]> {
    await this.restaurantsService.findOne(restaurantId);

    const [categories, items] = await Promise.all([
      this.database.db.query.menuCategories.findMany({
        where: eq(menuCategories.restaurantId, restaurantId),
      }),
      this.database.db.query.menuItems.findMany({
        where: eq(menuItems.restaurantId, restaurantId),
      }),
    ]);

    return categories.map((category) => ({
      ...category,
      items: items.filter((item) => item.categoryId === category.id),
    }));
  }

  // ----- Categories -----

  async createCategory(
    restaurantId: string,
    user: AuthUser,
    dto: CreateMenuCategoryDto,
  ): Promise<MenuCategory> {
    await this.assertOwnership(restaurantId, user);

    const [category] = await this.database.db
      .insert(menuCategories)
      .values({ restaurantId, name: dto.name })
      .returning();

    return category;
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    user: AuthUser,
    dto: UpdateMenuCategoryDto,
  ): Promise<MenuCategory> {
    await this.assertOwnership(restaurantId, user);
    await this.findCategory(restaurantId, categoryId);

    const [updated] = await this.database.db
      .update(menuCategories)
      .set({ name: dto.name, updatedAt: new Date() })
      .where(eq(menuCategories.id, categoryId))
      .returning();

    return updated;
  }

  async removeCategory(
    restaurantId: string,
    categoryId: string,
    user: AuthUser,
  ): Promise<MenuCategory> {
    await this.assertOwnership(restaurantId, user);
    await this.findCategory(restaurantId, categoryId);

    const [deleted] = await this.database.db
      .delete(menuCategories)
      .where(eq(menuCategories.id, categoryId))
      .returning();

    return deleted;
  }

  // ----- Items -----

  async createItem(
    restaurantId: string,
    user: AuthUser,
    dto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    await this.assertOwnership(restaurantId, user);
    await this.findCategory(restaurantId, dto.categoryId);

    const [item] = await this.database.db
      .insert(menuItems)
      .values({
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price.toFixed(2),
        imageUrl: dto.imageUrl,
      })
      .returning();

    return item;
  }

  async updateItem(
    restaurantId: string,
    itemId: string,
    user: AuthUser,
    dto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    await this.assertOwnership(restaurantId, user);
    await this.findItem(restaurantId, itemId);

    if (dto.categoryId !== undefined) {
      await this.findCategory(restaurantId, dto.categoryId);
    }

    const updateData: Partial<NewMenuItem> = { updatedAt: new Date() };

    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price.toFixed(2);
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;

    const [updated] = await this.database.db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, itemId))
      .returning();

    return updated;
  }

  async removeItem(
    restaurantId: string,
    itemId: string,
    user: AuthUser,
  ): Promise<MenuItem> {
    await this.assertOwnership(restaurantId, user);
    await this.findItem(restaurantId, itemId);

    const [deleted] = await this.database.db
      .delete(menuItems)
      .where(eq(menuItems.id, itemId))
      .returning();

    return deleted;
  }

  // ----- Helpers -----

  private async assertOwnership(
    restaurantId: string,
    user: AuthUser,
  ): Promise<void> {
    const restaurant = await this.restaurantsService.findOne(restaurantId);

    if (restaurant.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this restaurant');
    }
  }

  private async findCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<MenuCategory> {
    const category = await this.database.db.query.menuCategories.findFirst({
      where: and(
        eq(menuCategories.id, categoryId),
        eq(menuCategories.restaurantId, restaurantId),
      ),
    });

    if (!category) {
      throw new NotFoundException('Menu category not found');
    }

    return category;
  }

  private async findItem(
    restaurantId: string,
    itemId: string,
  ): Promise<MenuItem> {
    const item = await this.database.db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.restaurantId, restaurantId),
      ),
    });

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }
}
