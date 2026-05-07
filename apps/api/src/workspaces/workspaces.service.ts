import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import { encrypt } from '../common/crypto';
import type { CreateWorkspaceDto, UpdateAIConfigDto, UpdateBusinessInfoDto, UpdateWhatsAppSettingsDto } from './dto/workspaces.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(WorkspacesService.name) private readonly logger: PinoLogger,
  ) {}

  async create(supabaseUserId: string, email: string, dto: CreateWorkspaceDto) {
    const user = await this.prisma.user.upsert({
      where: { supabaseUserId },
      update: { email },
      create: { supabaseUserId, email },
    });

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        members: {
          create: { userId: user.id, role: 'owner' },
        },
        aiConfig: {
          create: {},
        },
      },
      include: { aiConfig: true },
    });

    this.logger.info({ workspaceId: workspace.id }, 'Workspace created');
    return workspace;
  }

  async getForUser(supabaseUserId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { user: { supabaseUserId } },
      include: { workspace: { include: { aiConfig: true } } },
    });
    return memberships.map((m) => m.workspace);
  }

  async getById(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { aiConfig: true },
    });
    if (!workspace) throw new NotFoundError('Workspace', workspaceId);
    return workspace;
  }

  async completeOnboarding(workspaceId: string) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { onboardingCompleted: true },
    });
  }

  async updateAIConfig(workspaceId: string, dto: UpdateAIConfigDto) {
    return this.prisma.aIConfig.upsert({
      where: { workspaceId },
      update: dto,
      create: { workspaceId, ...dto },
    });
  }

  async updateWhatsAppSettings(
    workspaceId: string,
    data: { phoneNumberId?: string; wabaId?: string; accessTokenEnc?: string },
  ) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  async updateBusinessInfo(workspaceId: string, dto: UpdateBusinessInfoDto) {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dto,
      select: { id: true, name: true, timezone: true, locale: true, updatedAt: true },
    });
    this.logger.info({ workspaceId }, 'Business info updated');
    return workspace;
  }

  async updateWhatsAppSettingsFromDto(workspaceId: string, dto: UpdateWhatsAppSettingsDto) {
    const data: { phoneNumberId?: string; wabaId?: string; accessTokenEnc?: string } = {};
    if (dto.phoneNumberId !== undefined) data.phoneNumberId = dto.phoneNumberId;
    if (dto.wabaId !== undefined) data.wabaId = dto.wabaId;
    if (dto.accessToken) data.accessTokenEnc = encrypt(dto.accessToken);

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
      select: {
        id: true, name: true, phoneNumberId: true, wabaId: true,
        voiceCloneStatus: true, voiceCloneId: true, onboardingCompleted: true,
        createdAt: true, updatedAt: true,
      },
    });

    this.logger.info({ workspaceId }, 'WhatsApp settings updated');
    return workspace;
  }
}
