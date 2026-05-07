import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WhatsAppService } from './whatsapp.service';
import { PipelineService } from './pipeline.service';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { AIModule } from '../ai/ai.module';
import { MemoryModule } from '../memory/memory.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [ContactsModule, ConversationsModule, forwardRef(() => MessagesModule), AIModule, MemoryModule, OrdersModule, ProductsModule, RulesModule],
  controllers: [WebhookController],
  providers: [WhatsAppService, PipelineService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
