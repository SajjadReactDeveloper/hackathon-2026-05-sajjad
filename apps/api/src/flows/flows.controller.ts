import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FlowsService } from './flows.service';
import { z } from 'zod';

const FlowGraphSchema = z.object({
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});

const CreateFlowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  graph: FlowGraphSchema.optional(),
  isActive: z.boolean().optional(),
});

const UpdateFlowSchema = CreateFlowSchema.partial();

@Controller('flows')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.flowsService.list(workspaceId);
  }

  @Get(':id')
  getById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.flowsService.getById(workspaceId, id);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(CreateFlowSchema)) body: z.infer<typeof CreateFlowSchema>,
  ) {
    return this.flowsService.create(workspaceId, body);
  }

  @Patch(':id')
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFlowSchema)) body: z.infer<typeof UpdateFlowSchema>,
  ) {
    return this.flowsService.update(workspaceId, id, body);
  }

  @Delete(':id')
  delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.flowsService.delete(workspaceId, id).then(() => ({ deleted: true }));
  }
}
