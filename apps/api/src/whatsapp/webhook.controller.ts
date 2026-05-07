import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { WhatsAppService } from './whatsapp.service';
import { PipelineService } from './pipeline.service';
import { env } from '../common/env';

@Controller('webhooks/whatsapp')
export class WebhookController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly pipeline: PipelineService,
    @InjectPinoLogger(WebhookController.name) private readonly logger: PinoLogger,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = env.WHATSAPP_APP_SECRET || 'flowchat-verify-token';
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.info('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
  ) {
    // rawBody is injected by the Express middleware in main.ts before JSON parsing
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (rawBody && env.WHATSAPP_APP_SECRET) {
      const valid = this.whatsappService.verifyWebhookSignature(
        rawBody,
        signature,
        env.WHATSAPP_APP_SECRET,
      );
      if (!valid) {
        this.logger.warn('Invalid webhook signature');
        return { status: 'invalid_signature' };
      }
    }

    const event = this.whatsappService.parseWebhookEvent(body);
    if (!event) return { status: 'no_message' };

    this.logger.info({ from: event.from, type: event.type }, 'Webhook received');

    this.pipeline.handle(event).catch((err: unknown) => {
      this.logger.error({ err }, 'Pipeline error');
    });

    return { status: 'ok' };
  }
}
