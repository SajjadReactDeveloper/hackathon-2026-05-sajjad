import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [forwardRef(() => WhatsAppModule), ConversationsModule, WorkspacesModule, StorageModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
