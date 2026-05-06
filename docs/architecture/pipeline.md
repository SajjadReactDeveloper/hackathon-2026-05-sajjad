# docs/architecture/pipeline.md — The WhatsApp Message Pipeline

The orchestrator that turns inbound Meta webhooks into AI replies + orders + outbound messages. Single entrypoint: `apps/api/src/whatsapp/pipeline.service.ts`. Called by `WebhookController` after signature verify.

## Why this is a single service

All inbound message handling — text / audio / image branches — lives in one file so the routing decision tree stays visible. Don't split into per-type services unless `pipeline.service.ts` grows past ~300 lines.

## Flow

```
Meta POST /webhooks/whatsapp
 ├─ raw-body middleware preserves payload bytes (signature verify needs them)
 ├─ verify HMAC-SHA256 against META_APP_SECRET; reject 403 on mismatch
 │
 ├─ MessagesService.recordInbound({ rawPayload, waMessageId, ... })
 │   └─ idempotent on waMessageId UNIQUE — duplicate webhooks are no-ops
 │
 ├─ resolve workspace (lookup by phoneNumberId in payload)
 ├─ resolve contact (getOrCreateByPhone)
 ├─ resolve conversation (getOrCreateForContact)
 │
 ├─ RuleEngineService.match(workspaceId, message)
 │   └─ first matching rule by priority
 │      if rule.action === 'skip_ai':
 │         → fire rule.replyTemplate via WhatsAppService.sendText
 │         → MessagesService.recordOutbound (mark ruleFired=true)
 │         → STOP
 │
 ├─ AIReplyService.detectInputLanguage(message) → 'urdu' | 'english' | 'roman_urdu' | 'voice'
 │
 └─ branch on message.type:
   │
   ├─ 'audio':
   │   ├─ VoiceParserService.transcribe(media) ──► Whisper
   │   ├─ VoiceParserService.parseToOrder(transcript) ──► Groq + Zod schema
   │   ├─ OrdersService.createFromVoiceParse(parsed) (txn: order + items + LTV; FraudScore inside)
   │   ├─ AIReplyService.generateOrderConfirmation(order, lang)
   │   ├─ VoiceReplyService.synthesize(replyText, lang, workspaceId)
   │   │   └─ if Roman Urdu, transliterate via Groq before TTS
   │   │   └─ if voiceCloneStatus='ready' → ElevenLabs; else → OpenAI tts-1
   │   │   └─ upload to Supabase Storage `tts/`; return signed URL
   │   ├─ WhatsAppService.sendAudio(to, signedUrl)
   │   └─ MessagesService.recordOutbound(audio, ai_generated=true)
   │
   ├─ 'image':
   │   ├─ ImageOrderService.parseImageToOrder(media) ──► GPT-4o-mini Vision + Zod
   │   ├─ OrdersService.createFromImageParse(parsed)
   │   ├─ AIReplyService.generateOrderConfirmation(order, lang)
   │   ├─ WhatsAppService.sendText(to, replyText)
   │   └─ MessagesService.recordOutbound
   │
   └─ 'text' (autoReplyEnabled && businessHoursOk):
       ├─ MemoryService.composeForReply(conversationId)
       │   └─ { recent: last 20 msgs, facts: ContactFact[], lastOrders: 5 }
       │   └─ KB is a TOOL, not always-injected — see tools.md
       │
       ├─ AIReplyService.generate(conversationId, replyLanguage, memory)
       │   └─ TOOL-CALLING LOOP (max 3 iterations, 15s wall-clock):
       │      ┌─► Groq inference with system prompt + memory + 8 tool schemas
       │      │   if response.tool_calls:
       │      │     for each call: ToolRegistry.execute(name, args, {workspaceId, contactId})
       │      │     append results to messages
       │      │     continue ──┘
       │      └─ break with { text, attachments?, toolCallsTrace }
       │
       ├─ if attachments: WhatsAppService.sendImage(productImageUrl, caption)
       │  else: WhatsAppService.sendText
       ├─ MessagesService.recordOutbound (incl. toolCallsTrace in metadata)
       └─ ContactFactsService.extractFromConversation (fire-and-forget; updates contact_facts)
```

## Hard rules

- **`MessagesService.recordInbound` is idempotent.** Always upsert on `waMessageId`. Meta retries on non-200 — don't double-process.
- **`RuleEngineService` runs before AI** so a matching rule can short-circuit the LLM. Saves cost and gives sellers escape hatches.
- **Tool calling caps at 3 iterations + 15s.** If exceeded, fall back to canned bilingual "thori der mein reply karta hu / I'll get back to you shortly." Do NOT remove the cap.
- **`workspaceId` flows from session → guard → service.** Pipeline service does NOT read workspace data from request body.
- **Errors in pipeline are logged + Sentry'd, but webhook still returns 200.** Otherwise Meta retries forever and we double-bill the AI.

## Failure modes worth knowing

- Whisper returns garbled text on bad-quality audio → VoiceParserService falls back to "couldn't hear that, could you type it?" reply.
- GPT-4o-mini Vision misreads product photo → ImageOrderService asks user to clarify rather than create a wrong order.
- Groq tool-call routing picks the wrong tool → bounded by max iterations; final reply may be off-topic but never fatal.
- Roman Urdu → Urdu transliteration is imperfect → Settings/AI has a manual override toggle (P3).
