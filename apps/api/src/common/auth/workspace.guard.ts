import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenError, UnauthorizedError } from '../errors';
import type { Request } from 'express';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { user: AuthUser; workspaceId: string }
    >();

    const user = request.user;
    if (!user) throw new UnauthorizedError();

    const workspaceId =
      (request.params['workspaceId'] as string | undefined) ??
      (request.headers['x-workspace-id'] as string | undefined);

    if (!workspaceId) throw new ForbiddenError('Workspace ID required');

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { supabaseUserId: user.supabaseUserId },
      },
    });

    if (!member) throw new ForbiddenError('Not a member of this workspace');

    request.workspaceId = workspaceId;
    return true;
  }
}
