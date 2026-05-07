import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { AIModule } from './ai/ai.module';
import { MemoryModule } from './memory/memory.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OrdersModule } from './orders/orders.module';
import { StorageModule } from './storage/storage.module';
import { ProductsModule } from './products/products.module';
import { RulesModule } from './rules/rules.module';
import { KbModule } from './kb/kb.module';
import { LostSalesModule } from './lost-sales/lost-sales.module';
import { FlowsModule } from './flows/flows.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        redact: {
          paths: ['req.headers.authorization', 'req.body.accessToken', 'req.body.password'],
          censor: '[REDACTED]',
        },
        autoLogging: { ignore: (req: import('http').IncomingMessage) => req.url === '/health' },
      },
    }),
    PrismaModule,
    WorkspacesModule,
    WhatsAppModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    AIModule,
    MemoryModule,
    AnalyticsModule,
    OrdersModule,
    StorageModule,
    ProductsModule,
    RulesModule,
    KbModule,
    LostSalesModule,
    FlowsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
