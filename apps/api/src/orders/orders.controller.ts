import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PaginationSchema } from '@repo/types';
import { OrdersService } from './orders.service';
import { z } from 'zod';

const UpdateStatusSchema = z.object({ status: z.string().min(1) });

@Controller('orders')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @Query(new ZodValidationPipe(PaginationSchema)) pagination: { page: number; limit: number },
  ) {
    return this.ordersService.list(workspaceId, pagination.page, pagination.limit);
  }

  @Get(':id')
  getById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.ordersService.getById(workspaceId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStatusSchema)) body: { status: string },
  ) {
    return this.ordersService.updateStatus(workspaceId, id, body.status);
  }
}
