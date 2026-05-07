import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../common/auth/supabase-auth.guard';
import { WorkspaceGuard } from '../common/auth/workspace.guard';
import { WorkspaceId } from '../common/auth/current-user.decorator';
import { KbService } from './kb.service';
import type { Express } from 'express';

@Controller('kb')
@UseGuards(SupabaseAuthGuard, WorkspaceGuard)
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.kbService.list(workspaceId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @WorkspaceId() workspaceId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.mimetype.includes('pdf')) throw new BadRequestException('Only PDF files are supported');
    return this.kbService.uploadDocument(workspaceId, file.buffer, file.originalname);
  }

  @Delete(':id')
  delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.kbService.delete(workspaceId, id);
  }
}
