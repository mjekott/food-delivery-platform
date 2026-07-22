import { UserRole, type AuthUser } from '@food-delivery/types';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import {
  restaurants,
  type NewRestaurant,
  type Restaurant,
} from '../../core/database/schema/restaurant';
import { paginate, type PaginatedResult } from '../../core/pagination';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly database: DatabaseService) {}

  async create(ownerId: string, dto: CreateRestaurantDto): Promise<Restaurant> {
    const existing = await this.database.db.query.restaurants.findFirst({
      where: eq(restaurants.ownerId, ownerId),
    });

    if (existing) {
      throw new ConflictException('You already have a restaurant');
    }

    const [restaurant] = await this.database.db
      .insert(restaurants)
      .values({
        ownerId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      })
      .returning();

    return restaurant;
  }

  findAll(
    query: FindRestaurantsQueryDto,
  ): Promise<PaginatedResult<Restaurant>> {
    const term = query.search?.trim();

    return paginate<Restaurant>(this.database.db, restaurants, {
      page: query.page,
      limit: query.limit,
      where: and(
        eq(restaurants.isOpen, 'true'),
        term
          ? or(
              ilike(restaurants.name, `%${term}%`),
              ilike(restaurants.address, `%${term}%`),
            )
          : undefined,
      ),
      orderBy: desc(restaurants.createdAt),
    });
  }

  async findMine(ownerId: string): Promise<Restaurant | null> {
    const restaurant = await this.database.db.query.restaurants.findFirst({
      where: eq(restaurants.ownerId, ownerId),
    });

    return restaurant ?? null;
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.database.db.query.restaurants.findFirst({
      where: eq(restaurants.id, id),
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(
    id: string,
    user: AuthUser,
    dto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurant = await this.findOne(id);

    if (restaurant.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this restaurant');
    }

    const updateData: Partial<NewRestaurant> = { updatedAt: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.isOpen !== undefined) updateData.isOpen = String(dto.isOpen);

    const [updated] = await this.database.db
      .update(restaurants)
      .set(updateData)
      .where(eq(restaurants.id, id))
      .returning();

    return updated;
  }
}
