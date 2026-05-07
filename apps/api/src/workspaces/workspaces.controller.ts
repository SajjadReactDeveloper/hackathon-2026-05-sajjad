import { Controller, Get, Post, Patch, Body, UseGuards, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { CurrentUser, WorkspaceId, type AuthUser } from '../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { WorkspacesService } from './workspaces.service';
import { VoiceCloneService } from '../ai/voice-clone.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { decrypt } from '../common/crypto';
import {
  CreateWorkspaceSchema,
  UpdateAIConfigSchema,
  UpdateBusinessInfoSchema,
  UpdateWhatsAppSettingsSchema,
  type CreateWorkspaceDto,
  type UpdateAIConfigDto,
  type UpdateBusinessInfoDto,
  type UpdateWhatsAppSettingsDto,
} from './dto/workspaces.dto';

@Controller('workspaces')
@UseGuards(SupabaseAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly voiceCloneService: VoiceCloneService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.supabaseUserId, user.email, dto);
  }

  @Get('me')
  getMyWorkspaces(@CurrentUser() user: AuthUser) {
    return this.workspacesService.getForUser(user.supabaseUserId);
  }

  @Get('current')
  @UseGuards(WorkspaceGuard)
  getCurrent(@WorkspaceId() workspaceId: string) {
    return this.workspacesService.getById(workspaceId);
  }

  @Patch('business')
  @UseGuards(WorkspaceGuard)
  updateBusinessInfo(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(UpdateBusinessInfoSchema)) dto: UpdateBusinessInfoDto,
  ) {
    return this.workspacesService.updateBusinessInfo(workspaceId, dto);
  }

  @Patch('ai-config')
  @UseGuards(WorkspaceGuard)
  updateAIConfig(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(UpdateAIConfigSchema)) dto: UpdateAIConfigDto,
  ) {
    return this.workspacesService.updateAIConfig(workspaceId, dto);
  }

  @Patch('whatsapp-settings')
  @UseGuards(WorkspaceGuard)
  updateWhatsAppSettings(
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(UpdateWhatsAppSettingsSchema)) dto: UpdateWhatsAppSettingsDto,
  ) {
    return this.workspacesService.updateWhatsAppSettingsFromDto(workspaceId, dto);
  }

  @Post('voice-clone')
  @UseGuards(WorkspaceGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 30 * 1024 * 1024 } }))
  async trainVoiceClone(
    @WorkspaceId() workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const voiceId = await this.voiceCloneService.createClone(
      workspaceId,
      file.buffer,
      file.mimetype,
    );
    return { voiceId, status: 'ready' };
  }

  @Post('voice-clone/delete')
  @UseGuards(WorkspaceGuard)
  deleteVoiceClone(@WorkspaceId() workspaceId: string) {
    return this.voiceCloneService.deleteClone(workspaceId).then(() => ({ deleted: true }));
  }

  @Post('test-connection')
  @UseGuards(WorkspaceGuard)
  @HttpCode(HttpStatus.OK)
  async testConnection(@WorkspaceId() workspaceId: string) {
    const workspace = await this.workspacesService.getById(workspaceId);
    if (!workspace.phoneNumberId || !workspace.accessTokenEnc) {
      return { ok: false, error: 'Phone Number ID and Access Token must be saved first.' };
    }
    const accessToken = decrypt(workspace.accessTokenEnc);
    const info = await this.whatsapp.verifyCredentials(workspace.phoneNumberId, accessToken);
    return { ok: true, displayPhoneNumber: info.displayPhoneNumber, verifiedName: info.verifiedName };
  }

  @Post('onboarding/complete')
  @UseGuards(WorkspaceGuard)
  completeOnboarding(@WorkspaceId() workspaceId: string) {
    return this.workspacesService.completeOnboarding(workspaceId);
  }
}
