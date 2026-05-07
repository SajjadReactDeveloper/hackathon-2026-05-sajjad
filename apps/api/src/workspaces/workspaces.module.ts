import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { VoiceCloneService } from '../ai/voice-clone.service';
import { StorageModule } from '../storage/storage.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Module({
  imports: [StorageModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, VoiceCloneService, WhatsAppService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
