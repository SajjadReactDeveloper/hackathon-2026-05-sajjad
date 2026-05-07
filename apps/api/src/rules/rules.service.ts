import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import type { AutoRule, AutoRuleMatchScope, AutoRuleAction } from '@repo/db';

export interface CreateRuleDto {
  name: string;
  triggerPattern: string;
  matchScope?: AutoRuleMatchScope;
  replyTemplate?: string;
  action?: AutoRuleAction;
  priority?: number;
}

export interface MatchResult {
  matched: boolean;
  rule?: AutoRule;
  replyText?: string;
  action?: AutoRuleAction;
}

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(RulesService.name) private readonly logger: PinoLogger,
  ) {}

  async list(workspaceId: string) {
    return this.prisma.autoRule.findMany({
      where: { workspaceId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(workspaceId: string, dto: CreateRuleDto): Promise<AutoRule> {
    return this.prisma.autoRule.create({
      data: { workspaceId, ...dto },
    });
  }

  async update(workspaceId: string, id: string, dto: Partial<CreateRuleDto> & { enabled?: boolean }): Promise<AutoRule> {
    const updated = await this.prisma.autoRule.updateMany({
      where: { id, workspaceId },
      data: dto,
    });
    if (updated.count === 0) throw new NotFoundError('AutoRule', id);
    const rule = await this.prisma.autoRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('AutoRule', id);
    return rule;
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const deleted = await this.prisma.autoRule.deleteMany({
      where: { id, workspaceId },
    });
    if (deleted.count === 0) throw new NotFoundError('AutoRule', id);
  }

  async match(workspaceId: string, text: string, transcription?: string): Promise<MatchResult> {
    const rules = await this.prisma.autoRule.findMany({
      where: { workspaceId, enabled: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    for (const rule of rules) {
      let target = '';
      if (rule.matchScope === 'text') target = text;
      else if (rule.matchScope === 'transcription') target = transcription ?? '';
      else target = `${text} ${transcription ?? ''}`;

      let matches = false;
      try {
        matches = new RegExp(rule.triggerPattern, 'i').test(target);
      } catch {
        this.logger.warn({ ruleId: rule.id, pattern: rule.triggerPattern }, 'Invalid regex in rule');
        continue;
      }

      if (matches) {
        this.logger.debug({ ruleId: rule.id, name: rule.name, action: rule.action }, 'Rule matched');
        return {
          matched: true,
          rule,
          replyText: rule.replyTemplate ?? undefined,
          action: rule.action,
        };
      }
    }

    return { matched: false };
  }
}
