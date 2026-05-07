import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tiles')
  tiles(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getDashboardTiles(workspaceId);
  }

  @Get('revenue')
  revenue(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getDailyRevenue(workspaceId);
  }

  @Get('messages')
  messages(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getMessageVolume(workspaceId);
  }

  @Get('heatmap')
  heatmap(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getHeatmap(workspaceId);
  }
}
