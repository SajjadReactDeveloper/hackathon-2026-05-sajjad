import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../common/errors';

export interface FlowGraph {
  nodes: unknown[];
  edges: unknown[];
}

export interface CreateFlowDto {
  name: string;
  description?: string;
  graph?: FlowGraph;
  isActive?: boolean;
}

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(FlowsService.name) private readonly logger: PinoLogger,
  ) {}

  list(workspaceId: string) {
    return this.prisma.flow.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(workspaceId: string, id: string) {
    return this.prisma.flow.findFirst({ where: { id, workspaceId } })
      .then((f) => { if (!f) throw new NotFoundError('Flow', id); return f; });
  }

  create(workspaceId: string, dto: CreateFlowDto) {
    return this.prisma.flow.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        graph: (dto.graph ?? { nodes: [], edges: [] }) as object,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async update(workspaceId: string, id: string, dto: Partial<CreateFlowDto>) {
    const updated = await this.prisma.flow.updateMany({
      where: { id, workspaceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.graph !== undefined && { graph: dto.graph as object }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    if (updated.count === 0) throw new NotFoundError('Flow', id);
    return this.prisma.flow.findUnique({ where: { id } });
  }

  async delete(workspaceId: string, id: string) {
    const deleted = await this.prisma.flow.deleteMany({ where: { id, workspaceId } });
    if (deleted.count === 0) throw new NotFoundError('Flow', id);
  }
}
