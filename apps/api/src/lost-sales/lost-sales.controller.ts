import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { LostSaleService } from './lost-sale.service';

@Controller('lost-sales')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class LostSalesController {
  constructor(private readonly lostSaleService: LostSaleService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.lostSaleService.list(workspaceId);
  }

  @Post('scan')
  scan(@WorkspaceId() workspaceId: string) {
    return this.lostSaleService.detectStale(workspaceId).then((count) => ({ flagged: count }));
  }

  @Post(':id/analyze')
  analyze(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.lostSaleService.analyzeReason(workspaceId, id);
  }

  @Post(':id/recover')
  recover(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.lostSaleService.recover(workspaceId, id).then(() => ({ recovered: true }));
  }
}
