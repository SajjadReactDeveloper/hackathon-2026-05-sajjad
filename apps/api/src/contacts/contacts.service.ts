import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';
import type { Contact } from '@repo/db';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ContactsService.name) private readonly logger: PinoLogger,
  ) {}

  async getOrCreateByPhone(
    workspaceId: string,
    waPhone: string,
    profileName?: string,
  ): Promise<Contact> {
    const existing = await this.prisma.contact.findUnique({
      where: { workspaceId_waPhone: { workspaceId, waPhone } },
    });
    if (existing) {
      if (profileName && !existing.profileName) {
        return this.prisma.contact.update({
          where: { id: existing.id },
          data: { profileName, displayName: profileName },
        });
      }
      return existing;
    }
    this.logger.info({ workspaceId, waPhone }, 'Creating new contact');
    return this.prisma.contact.create({
      data: {
        workspaceId,
        waPhone,
        profileName,
        displayName: profileName,
      },
    });
  }

  async list(workspaceId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where: { workspaceId },
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit };
  }

  async getById(workspaceId: string, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        facts: { orderBy: { createdAt: 'desc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!contact) throw new NotFoundError('Contact', id);
    return contact;
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.prisma.contact.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }
}
