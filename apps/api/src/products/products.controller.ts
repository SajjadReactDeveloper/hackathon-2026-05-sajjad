import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProductsService } from './products.service';
import { z } from 'zod';

const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

@Controller('products')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.productsService.list(workspaceId);
  }

  @Get(':id')
  getById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.getById(workspaceId, id);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(CreateProductSchema)) body: z.infer<typeof CreateProductSchema>,
  ) {
    return this.productsService.create(workspaceId, body);
  }

  @Patch(':id')
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) body: z.infer<typeof UpdateProductSchema>,
  ) {
    return this.productsService.update(workspaceId, id, body);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(workspaceId, id, file.buffer, file.mimetype);
  }

  @Delete(':id')
  delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.delete(workspaceId, id).then(() => ({ deleted: true }));
  }
}
