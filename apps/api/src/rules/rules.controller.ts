import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RulesService } from './rules.service';
import { z } from 'zod';

const CreateRuleSchema = z.object({
  name: z.string().min(1),
  triggerPattern: z.string().min(1),
  matchScope: z.enum(['text', 'transcription', 'any']).optional(),
  replyTemplate: z.string().optional(),
  action: z.enum(['send_text', 'tag_contact', 'skip_ai']).optional(),
  priority: z.number().int().optional(),
});

const UpdateRuleSchema = CreateRuleSchema.partial().extend({
  enabled: z.boolean().optional(),
});

@Controller('rules')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.rulesService.list(workspaceId);
  }

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(CreateRuleSchema)) body: z.infer<typeof CreateRuleSchema>,
  ) {
    return this.rulesService.create(workspaceId, body);
  }

  @Patch(':id')
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRuleSchema)) body: z.infer<typeof UpdateRuleSchema>,
  ) {
    return this.rulesService.update(workspaceId, id, body);
  }

  @Delete(':id')
  delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.rulesService.delete(workspaceId, id);
  }
}
