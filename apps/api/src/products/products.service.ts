import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { NotFoundError } from '../common/errors';
import { env } from '../common/env';
import type { Product } from '@repo/db';

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  priceCents: number;
  stock?: number;
  active?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  priceCents?: number;
  stock?: number;
  active?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    @InjectPinoLogger(ProductsService.name) private readonly logger: PinoLogger,
  ) {}

  async list(workspaceId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(workspaceId: string, id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) throw new NotFoundError('Product', id);
    return product;
  }

  async create(workspaceId: string, dto: CreateProductDto): Promise<Product> {
    const product = await this.prisma.product.create({
      data: {
        workspaceId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        priceCents: BigInt(dto.priceCents),
        stock: dto.stock ?? 0,
        active: dto.active ?? true,
      },
    });
    this.logger.info({ workspaceId, productId: product.id }, 'Product created');
    return product;
  }

  async update(workspaceId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const updated = await this.prisma.product.updateMany({
      where: { id, workspaceId },
      data: {
        ...dto,
        priceCents: dto.priceCents !== undefined ? BigInt(dto.priceCents) : undefined,
      },
    });
    if (updated.count === 0) throw new NotFoundError('Product', id);
    return this.prisma.product.findUnique({ where: { id } }) as Promise<Product>;
  }

  async uploadImage(workspaceId: string, id: string, buffer: Buffer, mimeType: string): Promise<Product> {
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const path = `${workspaceId}/${id}-${randomUUID()}.${ext}`;
    const signedUrl = await this.storage.uploadAndSign(
      env.SUPABASE_STORAGE_BUCKET_PRODUCTS,
      path,
      buffer,
      mimeType,
      365 * 24 * 3600,
    );

    const product = await this.prisma.product.updateMany({
      where: { id, workspaceId },
      data: { imageUrl: signedUrl },
    });
    if (product.count === 0) throw new NotFoundError('Product', id);

    this.logger.info({ workspaceId, productId: id }, 'Product image uploaded');
    return this.prisma.product.findUnique({ where: { id } }) as Promise<Product>;
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const deleted = await this.prisma.product.deleteMany({ where: { id, workspaceId } });
    if (deleted.count === 0) throw new NotFoundError('Product', id);
  }
}
