import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { env } from '../env';
import { UnauthorizedError } from '../errors';
import type { Request } from 'express';

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  aud: string;
  exp: number;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user: unknown }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = verify(token, env.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;

      if (payload.aud !== 'authenticated') {
        throw new UnauthorizedError('Invalid token audience');
      }

      request.user = {
        supabaseUserId: payload.sub,
        email: payload.email,
      };

      return true;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
