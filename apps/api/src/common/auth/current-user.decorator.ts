import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  supabaseUserId: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);

export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ workspaceId: string }>();
    return request.workspaceId;
  },
);
