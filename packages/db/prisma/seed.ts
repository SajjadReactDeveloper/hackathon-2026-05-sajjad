import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WS_ID   = 'a0000000-0000-0000-0000-000000000001';
const USER_ID  = 'b0000000-0000-0000-0000-000000000001';

// Stable UUID helpers — format is valid UUID v4-ish (static for idempotency)
function mid(section: number, n: number) {
  return `a0000000-0000-0000-${String(section).padStart(4,'0')}-${String(n).padStart(12,'0')}`;
}
// Section mapping: 1=product, 2=contact, 3=kbdoc, 4=conv, 5=order

function daysAgo(n: number, hourOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(21 + hourOffset, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function main() {
  console.log('Seeding database...');

  // Workspace + user
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      supabaseUserId: 'supabase-demo-user-001',
      email: 'sajjad.akhtar@chaingpt.tech',
      fullName: 'Sajjad Akhtar',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: {
      id: WS_ID,
      name: 'Fatima Boutique',
      phoneNumberId: 'DEMO_PHONE_NUMBER_ID',
      wabaId: 'DEMO_WABA_ID',
      timezone: 'Asia/Karachi',
      locale: 'ur-PK',
      onboardingCompleted: true,
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: WS_ID, userId: USER_ID } },
    update: {},
    create: { workspaceId: WS_ID, userId: USER_ID, role: 'owner' },
  });

  await prisma.aIConfig.upsert({
    where: { workspaceId: WS_ID },
    update: {},
    create: {
      workspaceId: WS_ID,
      autoReplyEnabled: true,
      ttsEnabled: true,
      ttsProvider: 'openai',
      ttsVoice: 'nova',
      systemPromptOverride: 'Aap Fatima Boutique ke liye ek dost assistant hain. Pakistani women\'s fashion specialist. Prices PKR mein batayein.',
    },
  });

  console.log('Created workspace:', workspace.name);

  // Products
  const productData = [
    { sku: 'LAWN-001',    name: 'Lawn Suit — Navy Blue',          priceCents: 350000n, stock: 15, description: 'Premium lawn fabric, unstitched, 3 piece. Perfect for summer.' },
    { sku: 'LAWN-002',    name: 'Lawn Suit — Dusty Rose',         priceCents: 320000n, stock: 8,  description: 'Embroidered lawn, unstitched, 3 piece. Limited stock.' },
    { sku: 'KAMEEZ-001',  name: 'White Kameez',                   priceCents: 180000n, stock: 20, description: 'Casual cotton kameez, available S-XL' },
    { sku: 'KAMEEZ-002',  name: 'Black Kameez',                   priceCents: 180000n, stock: 12, description: 'Casual cotton kameez, available S-XL' },
    { sku: 'DUPATTA-001', name: 'Chiffon Dupatta — Multicolor',   priceCents: 85000n,  stock: 30, description: 'Light chiffon, 2.5 meters' },
  ];

  for (const p of productData) {
    await prisma.product.upsert({
      where: { workspaceId_sku: { workspaceId: WS_ID, sku: p.sku } },
      update: {},
      create: { ...p, workspaceId: WS_ID, active: true },
    });
  }
  console.log('Seeded products');

  // Auto rules (5)
  await prisma.autoRule.deleteMany({ where: { workspaceId: WS_ID } });
  const rules = [
    {
      name: 'Address request',
      triggerPattern: '\\baddress\\b|\\bpata\\b|\\bghar\\b|\\bdelivery address\\b',
      matchScope: 'any' as const,
      replyTemplate: 'Apna poora address share karein: ghar number, gali, sheher, aur ek landmark. Shukriya!',
      action: 'send_text' as const,
      priority: 10,
      enabled: true,
    },
    {
      name: 'COD confirmation',
      triggerPattern: 'COD|cash on delivery|cashon|caash',
      matchScope: 'text' as const,
      replyTemplate: 'Ji zaroor, hum Cash on Delivery dete hain. Apna address aur order confirm karein!',
      action: 'send_text' as const,
      priority: 8,
      enabled: true,
    },
    {
      name: 'Return policy',
      triggerPattern: 'return|wapas|exchange|refund|change',
      matchScope: 'text' as const,
      replyTemplate: 'Hamari return policy 7 din hai delivery se. Item unused aur original packing mein hona chahiye. Details ke liye message karein.',
      action: 'send_text' as const,
      priority: 7,
      enabled: true,
    },
    {
      name: 'Delivery time query',
      triggerPattern: 'delivery time|kitne din|when.*deliver|kab.*milega',
      matchScope: 'any' as const,
      replyTemplate: 'Karachi mein 1-2 din, baaki Pakistan mein 3-5 business days. Tracking number order ke baad milega.',
      action: 'send_text' as const,
      priority: 6,
      enabled: true,
    },
    {
      name: 'After-hours (disabled)',
      triggerPattern: '.',
      matchScope: 'text' as const,
      replyTemplate: 'Shukriya message karne ka! Hamara working time subah 9 baje se raat 9 baje tak hai. Kal zaroor reply karein ge. JazakAllah Khair.',
      action: 'skip_ai' as const,
      priority: 1,
      enabled: false,
    },
  ];
  for (const rule of rules) {
    await prisma.autoRule.create({ data: { ...rule, workspaceId: WS_ID } });
  }
  console.log('Seeded 5 auto-rules');

  // Flows (3)
  const flows = [
    {
      name: 'After-hours Auto-reply',
      description: 'Sends canned response outside business hours',
      graph: {
        nodes: [
          { id: 'trigger', type: 'trigger', data: { label: 'Message received' }, position: { x: 100, y: 100 } },
          { id: 'check', type: 'condition', data: { label: 'Is after hours?' }, position: { x: 100, y: 250 } },
          { id: 'send', type: 'sendMessage', data: { label: 'Send auto-reply', message: 'We are closed. Will reply tomorrow.' }, position: { x: 100, y: 400 } },
        ],
        edges: [{ id: 'e1', source: 'trigger', target: 'check' }, { id: 'e2', source: 'check', target: 'send', label: 'Yes' }],
      },
    },
    {
      name: 'Voice Note → Confirm Order',
      description: 'Transcribes voice note, parses order, sends voice confirmation',
      graph: {
        nodes: [
          { id: 'trigger', type: 'trigger', data: { label: 'Voice note received' }, position: { x: 100, y: 100 } },
          { id: 'transcribe', type: 'transcribeAudio', data: { label: 'Whisper STT' }, position: { x: 100, y: 250 } },
          { id: 'parse', type: 'parseOrder', data: { label: 'Parse order (Groq)' }, position: { x: 100, y: 400 } },
          { id: 'confirm', type: 'sendAudio', data: { label: 'Send voice confirmation (ElevenLabs)' }, position: { x: 100, y: 550 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'transcribe' },
          { id: 'e2', source: 'transcribe', target: 'parse' },
          { id: 'e3', source: 'parse', target: 'confirm' },
        ],
      },
    },
    {
      name: 'Out of Stock → Notify Later',
      description: 'Tags contact and promises restock notification',
      graph: {
        nodes: [
          { id: 'trigger', type: 'trigger', data: { label: 'Out of stock detected' }, position: { x: 100, y: 100 } },
          { id: 'tag', type: 'tagContact', data: { label: 'Tag: waiting-restock' }, position: { x: 100, y: 250 } },
          { id: 'reply', type: 'sendMessage', data: { label: 'We will notify you when available' }, position: { x: 100, y: 400 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'tag' },
          { id: 'e2', source: 'tag', target: 'reply' },
        ],
      },
    },
  ];
  for (const flow of flows) {
    await prisma.flow.create({ data: { ...flow, workspaceId: WS_ID } }).catch(() => {});
  }
  console.log('Seeded 3 flows');

  // KB Documents (2 - status ready so they show in the list)
  await prisma.kbDocument.upsert({
    where: { id: mid(3,1) },
    update: {},
    create: {
      id: mid(3,1),
      workspaceId: WS_ID,
      name: 'Fatima Boutique — Product Catalogue 2026.pdf',
      sourceUrl: 'https://placeholder.supabase.co/storage/v1/object/public/kb/catalogue.pdf',
      pageCount: 12,
      status: 'ready',
    },
  });
  await prisma.kbDocument.upsert({
    where: { id: mid(3,2) },
    update: {},
    create: {
      id: mid(3,2),
      workspaceId: WS_ID,
      name: 'Delivery & Return Policy.pdf',
      sourceUrl: 'https://placeholder.supabase.co/storage/v1/object/public/kb/policy.pdf',
      pageCount: 3,
      status: 'ready',
    },
  });
  console.log('Seeded 2 KB documents');

  // ──────────────────────────────────────────────────────────────────────
  // Contacts (30)
  // ──────────────────────────────────────────────────────────────────────
  const contactData = [
    { localId: 'c01', waPhone: '+923001234001', displayName: 'Ahmad Khan',       orderCount: 3, lifetimeValueCents: 1050000n },
    { localId: 'c02', waPhone: '+923001234002', displayName: 'Fatima Ali',        orderCount: 2, lifetimeValueCents: 670000n },
    { localId: 'c03', waPhone: '+923001234003', displayName: 'Sara Mahmood',      orderCount: 1, lifetimeValueCents: 350000n },
    { localId: 'c04', waPhone: '+923001234004', displayName: 'Bilal Hassan',      orderCount: 2, lifetimeValueCents: 540000n },
    { localId: 'c05', waPhone: '+923001234005', displayName: 'Ayesha Siddiqui',   orderCount: 1, lifetimeValueCents: 320000n },
    { localId: 'c06', waPhone: '+923001234006', displayName: 'Usman Raza',        orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c07', waPhone: '+923001234007', displayName: 'Hina Tariq',        orderCount: 1, lifetimeValueCents: 180000n },
    { localId: 'c08', waPhone: '+923001234008', displayName: 'Kamran Malik',      orderCount: 3, lifetimeValueCents: 890000n },
    { localId: 'c09', waPhone: '+923001234009', displayName: 'Zara Hussain',      orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c10', waPhone: '+923001234010', displayName: 'Omer Sheikh',       orderCount: 2, lifetimeValueCents: 700000n },
    { localId: 'c11', waPhone: '+923001234011', displayName: 'Nadia Ansari',      orderCount: 1, lifetimeValueCents: 265000n },
    { localId: 'c12', waPhone: '+923001234012', displayName: 'Faisal Qureshi',    orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c13', waPhone: '+923001234013', displayName: 'Saima Butt',        orderCount: 2, lifetimeValueCents: 500000n },
    { localId: 'c14', waPhone: '+923001234014', displayName: 'Asad Mirza',        orderCount: 1, lifetimeValueCents: 350000n },
    { localId: 'c15', waPhone: '+923001234015', displayName: 'Maria Shafiq',      orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c16', waPhone: '+923001234016', displayName: 'Rashid Ahmed',      orderCount: 1, lifetimeValueCents: 180000n },
    { localId: 'c17', waPhone: '+923001234017', displayName: 'Rida Waheed',       orderCount: 2, lifetimeValueCents: 625000n },
    { localId: 'c18', waPhone: '+923001234018', displayName: 'Tariq Jameel',      orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c19', waPhone: '+923001234019', displayName: 'Sana Javed',        orderCount: 1, lifetimeValueCents: 320000n },
    { localId: 'c20', waPhone: '+923001234020', displayName: 'Hassan Iqbal',      orderCount: 3, lifetimeValueCents: 1020000n },
    { localId: 'c21', waPhone: '+923001234021', displayName: 'Lubna Pervaiz',     orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c22', waPhone: '+923001234022', displayName: 'Danish Nawaz',      orderCount: 1, lifetimeValueCents: 265000n },
    { localId: 'c23', waPhone: '+923001234023', displayName: 'Amina Rajput',      orderCount: 2, lifetimeValueCents: 700000n },
    { localId: 'c24', waPhone: '+923001234024', displayName: 'Waqar Zafar',       orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c25', waPhone: '+923001234025', displayName: 'Kiran Baig',        orderCount: 1, lifetimeValueCents: 350000n },
    { localId: 'c26', waPhone: '+923001234026', displayName: 'Shahid Latif',      orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c27', waPhone: '+923001234027', displayName: 'Rukhsana Khalid',   orderCount: 1, lifetimeValueCents: 180000n },
    { localId: 'c28', waPhone: '+923001234028', displayName: 'Imran Bashir',      orderCount: 2, lifetimeValueCents: 670000n },
    { localId: 'c29', waPhone: '+923001234029', displayName: 'Noor Fatima',       orderCount: 0, lifetimeValueCents: 0n },
    { localId: 'c30', waPhone: '+923001234030', displayName: 'Junaid Akram',      orderCount: 1, lifetimeValueCents: 320000n },
  ];

  for (const { localId: _lid, ...c } of contactData) {
    await prisma.contact.upsert({
      where: { workspaceId_waPhone: { workspaceId: WS_ID, waPhone: c.waPhone } },
      update: {},
      create: {
        ...c,
        workspaceId: WS_ID,
        lastSeenAt: daysAgo(Math.floor(Math.random() * 14)),
      },
    });
  }
  console.log('Seeded 30 contacts');

  // ──────────────────────────────────────────────────────────────────────
  // Conversations + Messages (active demo conversations)
  // ──────────────────────────────────────────────────────────────────────

  // Helper to create conv + msgs
  async function createConv(opts: {
    id: string;
    contactId: string;
    status: 'open' | 'resolved' | 'pending';
    msgs: Array<{ dir: 'inbound' | 'outbound'; text: string; lang: 'urdu' | 'english' | 'roman_urdu' | 'unknown'; hoursAgoVal: number; aiGenerated?: boolean }>;
    lostSale?: { status: 'analyzed'; reason: string; suggestion: string };
  }) {
    const lastMsg = opts.msgs[opts.msgs.length - 1];
    const lastMsgAt = hoursAgo(lastMsg.hoursAgoVal);
    const contact = contactData.find(c => c.localId === opts.contactId)!;

    const conv = await prisma.conversation.upsert({
      where: { id: opts.id },
      update: {},
      create: {
        id: opts.id,
        workspaceId: WS_ID,
        contactId: (await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: contact.waPhone } }))!.id,
        status: opts.status,
        aiEnabled: true,
        lastMessageAt: lastMsgAt,
        lastMessagePreview: lastMsg.text.substring(0, 80),
        unreadCount: opts.status === 'open' ? 1 : 0,
        lostSaleStatus: opts.lostSale ? 'analyzed' : 'not_lost',
        lostSaleReason: opts.lostSale?.reason ?? null,
        lostSaleSuggestion: opts.lostSale?.suggestion ?? null,
        lostSaleAnalyzedAt: opts.lostSale ? hoursAgo(1) : null,
      },
    });

    const contactRecord = await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: contact.waPhone } });
    if (!contactRecord) return conv;

    for (const msg of opts.msgs) {
      await prisma.message.create({
        data: {
          workspaceId: WS_ID,
          conversationId: conv.id,
          contactId: contactRecord.id,
          direction: msg.dir,
          waMessageId: `wa-${conv.id}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'text',
          textBody: msg.text,
          detectedLanguage: msg.lang,
          aiGenerated: msg.aiGenerated ?? (msg.dir === 'outbound'),
          status: 'delivered',
          createdAt: hoursAgo(msg.hoursAgoVal),
          updatedAt: hoursAgo(msg.hoursAgoVal),
        },
      });
    }

    return conv;
  }

  // --- 1. Ahmad Khan — Urdu buying conversation (active, recent order)
  const conv1 = await createConv({
    id: mid(4,1),
    contactId: 'c01',
    status: 'open',
    msgs: [
      { dir: 'inbound', text: 'Assalam o Alaikum, baji aapke lawn suit abhi available hain?', lang: 'urdu', hoursAgoVal: 48 },
      { dir: 'outbound', text: 'Wa Alaikum Assalam Ahmad bhai! Haan, Lawn Suit Navy Blue (Rs. 3,500) aur Dusty Rose (Rs. 3,200) dono available hain. Kaunsa dekhna chahenge?', lang: 'urdu', hoursAgoVal: 47, aiGenerated: true },
      { dir: 'inbound', text: 'Navy Blue bhej dijiye, 2 pieces chahiye', lang: 'urdu', hoursAgoVal: 46 },
      { dir: 'outbound', text: 'Bilkul Ahmad bhai! 2x Lawn Suit Navy Blue = Rs. 7,000. Apna delivery address share karein aur order confirm karein. COD available hai Karachi mein.', lang: 'urdu', hoursAgoVal: 45, aiGenerated: true },
      { dir: 'inbound', text: 'DHA Phase 5, Block L, House 42, Karachi', lang: 'roman_urdu', hoursAgoVal: 44 },
      { dir: 'outbound', text: 'Shukriya Ahmad bhai! Order confirm ho gaya: ORD-0001. 2x Navy Blue Lawn Suit — Rs. 7,000. COD. DHA Phase 5 Karachi. 1-2 din mein deliver ho ga InshaAllah.', lang: 'urdu', hoursAgoVal: 43, aiGenerated: true },
    ],
  });

  // --- 2. Fatima Ali — English conversation
  const conv2 = await createConv({
    id: mid(4,2),
    contactId: 'c02',
    status: 'open',
    msgs: [
      { dir: 'inbound', text: 'Hi! Do you have the dusty rose lawn suit in stock?', lang: 'english', hoursAgoVal: 36 },
      { dir: 'outbound', text: 'Hi Fatima! Yes, we have the Dusty Rose Lawn Suit (3-piece unstitched) in stock for Rs. 3,200. Would you like to order?', lang: 'english', hoursAgoVal: 35, aiGenerated: true },
      { dir: 'inbound', text: 'Yes please! Do you deliver to Lahore?', lang: 'english', hoursAgoVal: 34 },
      { dir: 'outbound', text: 'Absolutely! We deliver nationwide. Lahore delivery takes 3-5 business days. Shipping is free on orders above Rs. 2,500. Please share your address to confirm!', lang: 'english', hoursAgoVal: 33, aiGenerated: true },
      { dir: 'inbound', text: '15 Gulberg III, Lahore', lang: 'english', hoursAgoVal: 32 },
      { dir: 'outbound', text: 'Order confirmed! ORD-0002: 1x Dusty Rose Lawn Suit — Rs. 3,200. COD. Delivery to Gulberg III Lahore in 3-5 days. Thank you!', lang: 'english', hoursAgoVal: 31, aiGenerated: true },
    ],
  });

  // --- 3. Sara Mahmood — Roman Urdu voice note order
  const conv3 = await createConv({
    id: mid(4,3),
    contactId: 'c03',
    status: 'resolved',
    msgs: [
      { dir: 'inbound', text: '[Voice note: Salaam, mujhe 3 kameez chahiye, do white aur ek black, address hai DHA Phase 5 Karachi, Gali 12, koi bhi size medium chalega]', lang: 'roman_urdu', hoursAgoVal: 72 },
      { dir: 'outbound', text: 'Assalam o Alaikum Sara ji! Voice note mila. Order process ho raha hai: 2x White Kameez + 1x Black Kameez (all Medium) = Rs. 5,400. DHA Phase 5 Karachi. Confirm?', lang: 'urdu', hoursAgoVal: 71, aiGenerated: true },
      { dir: 'inbound', text: 'Haan confirm hai', lang: 'roman_urdu', hoursAgoVal: 70 },
      { dir: 'outbound', text: 'Shukriya Sara ji! ORD-0003 confirm. Rs. 5,400 COD. 1-2 din mein pahunch jayega.', lang: 'urdu', hoursAgoVal: 70, aiGenerated: true },
    ],
  });

  // --- 4. Bilal Hassan — Product price query with tool call
  const conv4 = await createConv({
    id: mid(4,4),
    contactId: 'c04',
    status: 'open',
    msgs: [
      { dir: 'inbound', text: 'kameez ka kya rate aur stock hai?', lang: 'roman_urdu', hoursAgoVal: 12 },
      { dir: 'outbound', text: 'Bilal bhai! Hamare pas 2 kameez hain:\n• White Kameez — Rs. 1,800 (20 in stock)\n• Black Kameez — Rs. 1,800 (12 in stock)\nDono sizes S se XL tak available hain. Kaunsa chahiye?', lang: 'roman_urdu', hoursAgoVal: 11, aiGenerated: true },
      { dir: 'inbound', text: 'dono chahiye ek ek, address bhejta hun', lang: 'roman_urdu', hoursAgoVal: 10 },
      { dir: 'outbound', text: 'Perfect! Jaldi address share karein, order confirm kar dete hain.', lang: 'roman_urdu', hoursAgoVal: 9, aiGenerated: true },
      { dir: 'inbound', text: 'Gulshan-e-Iqbal Block 13, Karachi', lang: 'roman_urdu', hoursAgoVal: 8 },
      { dir: 'outbound', text: 'ORD-0004 confirm: 1x White + 1x Black Kameez = Rs. 3,600 COD. Gulshan-e-Iqbal Karachi. 1-2 din mein milega InshaAllah!', lang: 'roman_urdu', hoursAgoVal: 7, aiGenerated: true },
    ],
  });

  // --- 5. Ayesha Siddiqui — Return policy query
  const conv5 = await createConv({
    id: mid(4,5),
    contactId: 'c05',
    status: 'open',
    msgs: [
      { dir: 'inbound', text: 'aapki return policy kya hai?', lang: 'roman_urdu', hoursAgoVal: 24 },
      { dir: 'outbound', text: 'Hamari return policy 7 din hai delivery se. Item unused aur original packing mein hona chahiye. Exchange ya refund dono available hain.', lang: 'roman_urdu', hoursAgoVal: 23, aiGenerated: true },
      { dir: 'inbound', text: 'Ok thanks. Lawn suit ka order karna hai', lang: 'roman_urdu', hoursAgoVal: 22 },
      { dir: 'outbound', text: 'Zaroor! Hamare pas Navy Blue (Rs. 3,500) aur Dusty Rose (Rs. 3,200) hain. Kaunsa pasand hai?', lang: 'roman_urdu', hoursAgoVal: 21, aiGenerated: true },
      { dir: 'inbound', text: 'Dusty rose. DHA Lahore address hai mera', lang: 'roman_urdu', hoursAgoVal: 20 },
      { dir: 'outbound', text: 'Shukriya Ayesha ji! ORD-0005: 1x Dusty Rose Lawn Suit Rs. 3,200 COD. DHA Lahore. 3-5 din delivery.', lang: 'urdu', hoursAgoVal: 19, aiGenerated: true },
    ],
  });

  console.log('Created 5 demo conversations');

  // Active conversations (for inbox showing)
  for (let i = 6; i <= 15; i++) {
    const contactIdx = i;
    const contact = contactData[contactIdx - 1];
    if (!contact) continue;
    const contactRecord = await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: contact.waPhone } });
    if (!contactRecord) continue;

    const conv = await prisma.conversation.upsert({
      where: { id: mid(4, i) },
      update: {},
      create: {
        id: mid(4, i),
        workspaceId: WS_ID,
        contactId: contactRecord.id,
        status: i % 3 === 0 ? 'resolved' : 'open',
        aiEnabled: true,
        lastMessageAt: daysAgo(i - 5),
        lastMessagePreview: 'Assalam o Alaikum, mujhe help chahiye',
        unreadCount: i % 2,
        lostSaleStatus: 'not_lost',
      },
    });

    const texts = [
      { d: 'inbound', t: 'Assalam o Alaikum, suit available hai?', h: (i - 5) * 24 + 2 },
      { d: 'outbound', t: 'Wa Alaikum Assalam! Haan available hai. Kaunsa chahiye?', h: (i - 5) * 24 + 1 },
    ];
    for (const m of texts) {
      await prisma.message.create({
        data: {
          workspaceId: WS_ID,
          conversationId: conv.id,
          contactId: contactRecord.id,
          direction: m.d as 'inbound' | 'outbound',
          waMessageId: `wa-conv${i}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'text',
          textBody: m.t,
          detectedLanguage: 'urdu',
          aiGenerated: m.d === 'outbound',
          status: 'delivered',
          createdAt: hoursAgo(m.h),
        },
      });
    }
  }
  console.log('Created 10 additional conversations');

  // ── LOST SALE conversations (3 with analyzed reasons) ──────────────────
  const lostSaleConvs = [
    {
      contactId: 'c06',
      id: mid(4,21),
      reason: 'Customer asked about delivery time to Islamabad but stopped responding after hearing it would take 5-7 days. Likely found a faster local supplier.',
      suggestion: 'Offer same-day Islamabad delivery via TCS Express for an extra Rs. 200 to re-engage. Follow up with a discount coupon.',
    },
    {
      contactId: 'c09',
      id: mid(4,22),
      reason: 'Customer was comparing prices and asked for bulk discount on 10 lawn suits. No response after quote was given — price may have been too high.',
      suggestion: 'Offer 10% off on orders of 5+ items. Message: "Zara ji, aapke liye 10% special discount on bulk — aaj hi order karein!"',
    },
    {
      contactId: 'c12',
      id: mid(4,23),
      reason: 'Customer inquired about a specific size (XXL) that was out of stock. Conversation ended with a promise to notify — no follow-up was sent.',
      suggestion: 'Send a restock notification if XXL is now available. If not, suggest similar items in available sizes with a personal recommendation.',
    },
  ];

  for (const ls of lostSaleConvs) {
    const contact = contactData.find(c => c.localId === ls.contactId)!;
    const contactRecord = await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: contact.waPhone } });
    if (!contactRecord) continue;

    const conv = await prisma.conversation.upsert({
      where: { id: ls.id },
      update: {},
      create: {
        id: ls.id,
        workspaceId: WS_ID,
        contactId: contactRecord.id,
        status: 'open',
        aiEnabled: true,
        lastMessageAt: daysAgo(7),
        lastMessagePreview: 'Yeh product kitne din mein milega?',
        unreadCount: 0,
        lostSaleStatus: 'analyzed',
        lostSaleReason: ls.reason,
        lostSaleSuggestion: ls.suggestion,
        lostSaleAnalyzedAt: daysAgo(1),
      },
    });

    const msgs = [
      { dir: 'inbound', text: 'Assalam o Alaikum, aapka lawn suit chahiye', h: 7 * 24 + 5 },
      { dir: 'outbound', text: 'Wa Alaikum Assalam! Zaroor, kaunsa suit pasand hai?', h: 7 * 24 + 4 },
      { dir: 'inbound', text: 'Navy Blue. Yeh product kitne din mein milega?', h: 7 * 24 + 3 },
      { dir: 'outbound', text: 'Islamabad mein 5-7 business days. Shall I confirm the order?', h: 7 * 24 + 2 },
    ];
    for (const m of msgs) {
      await prisma.message.create({
        data: {
          workspaceId: WS_ID,
          conversationId: conv.id,
          contactId: contactRecord.id,
          direction: m.dir as 'inbound' | 'outbound',
          waMessageId: `wa-${ls.id}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'text',
          textBody: m.text,
          detectedLanguage: 'roman_urdu',
          aiGenerated: m.dir === 'outbound',
          status: 'delivered',
          createdAt: hoursAgo(m.h),
        },
      });
    }
  }
  console.log('Seeded 3 lost sale conversations');

  // ── Add bulk messages for dashboard heatmap/charts (spread over 30 days) ──
  const bulkContactRecord = await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: '+923001234001' } });
  const bulkConvRecord = await prisma.conversation.findUnique({ where: { id: mid(4,1) } });

  if (bulkContactRecord && bulkConvRecord) {
    const daysForBulk = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30];
    const hoursForPeak = [21, 22, 21, 22, 20, 21, 22, 21, 22, 21]; // peak 9-11pm
    for (const day of daysForBulk) {
      for (let h = 0; h < 3; h++) {
        const hourOfDay = hoursForPeak[h % hoursForPeak.length];
        const msgDate = new Date();
        msgDate.setDate(msgDate.getDate() - day);
        msgDate.setHours(hourOfDay, Math.floor(Math.random() * 60), 0, 0);
        await prisma.message.create({
          data: {
            workspaceId: WS_ID,
            conversationId: bulkConvRecord.id,
            contactId: bulkContactRecord.id,
            direction: h % 2 === 0 ? 'inbound' : 'outbound',
            waMessageId: `wa-bulk-${day}-${h}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'text',
            textBody: h % 2 === 0 ? 'Assalam o Alaikum, order status?' : 'Wa Alaikum Assalam! Apka order dispatch ho gaya InshaAllah.',
            detectedLanguage: 'urdu',
            aiGenerated: h % 2 !== 0,
            status: 'delivered',
            createdAt: msgDate,
          },
        });
      }
    }
    console.log('Seeded bulk messages for heatmap/charts');
  }

  // ── Orders (12) ──────────────────────────────────────────────────────────
  const orderData = [
    { id: mid(5,1),  idx: 1,  contactId: 'c01', convId: mid(4,1),  num: 'ORD-0001', status: 'confirmed' as const,  total: 700000n, via: 'manual' as const,    fraud: 15, signals: ['COD order'],                    addr: 'DHA Phase 5, Block L, House 42, Karachi' },
    { id: mid(5,2),  idx: 2,  contactId: 'c02', convId: mid(4,2),  num: 'ORD-0002', status: 'shipped' as const,    total: 320000n, via: 'ai_parser' as const,  fraud: 10, signals: [],                               addr: '15 Gulberg III, Lahore' },
    { id: mid(5,3),  idx: 3,  contactId: 'c03', convId: mid(4,3),  num: 'ORD-0003', status: 'delivered' as const,  total: 540000n, via: 'voice_note' as const, fraud: 8,  signals: [],                               addr: 'DHA Phase 5, Gali 12, Karachi' },
    { id: mid(5,4),  idx: 4,  contactId: 'c04', convId: mid(4,4),  num: 'ORD-0004', status: 'confirmed' as const,  total: 360000n, via: 'ai_parser' as const,  fraud: 12, signals: [],                               addr: 'Gulshan-e-Iqbal Block 13, Karachi' },
    { id: mid(5,5),  idx: 5,  contactId: 'c05', convId: mid(4,5),  num: 'ORD-0005', status: 'processing' as const, total: 320000n, via: 'ai_parser' as const,  fraud: 20, signals: ['New contact'],                 addr: 'DHA Lahore' },
    { id: mid(5,6),  idx: 6,  contactId: 'c08', convId: mid(4,8),  num: 'ORD-0006', status: 'delivered' as const,  total: 890000n, via: 'manual' as const,    fraud: 5,  signals: [],                               addr: 'Garden Town, Lahore' },
    { id: mid(5,7),  idx: 7,  contactId: 'c10', convId: mid(4,10), num: 'ORD-0007', status: 'confirmed' as const,  total: 350000n, via: 'image' as const,     fraud: 35, signals: ['New contact', 'COD > 5000 PKR'], addr: 'House 5' },
    { id: mid(5,8),  idx: 8,  contactId: 'c13', convId: mid(4,13), num: 'ORD-0008', status: 'shipped' as const,    total: 265000n, via: 'ai_parser' as const,  fraud: 10, signals: [],                               addr: 'Nazimabad Karachi' },
    { id: mid(5,9),  idx: 9,  contactId: 'c17', convId: mid(4,17), num: 'ORD-0009', status: 'delivered' as const,  total: 625000n, via: 'voice_note' as const, fraud: 8,  signals: [],                               addr: 'Clifton Block 4 Karachi' },
    { id: mid(5,10), idx: 10, contactId: 'c20', convId: mid(4,20), num: 'ORD-0010', status: 'confirmed' as const,  total: 540000n, via: 'manual' as const,    fraud: 15, signals: ['COD order'],                    addr: 'PECHS Block 2 Karachi' },
    { id: mid(5,11), idx: 11, contactId: 'c23', convId: mid(4,23), num: 'ORD-0011', status: 'processing' as const, total: 700000n, via: 'ai_parser' as const,  fraud: 22, signals: ['New contact', 'High value COD'], addr: 'Faisal Town Lahore' },
    { id: mid(5,12), idx: 12, contactId: 'c28', convId: mid(4,28), num: 'ORD-0012', status: 'confirmed' as const,  total: 350000n, via: 'image' as const,     fraud: 18, signals: ['COD order'],                    addr: 'Gulshan-e-Ravi Lahore' },
  ];

  for (const o of orderData) {
    const contact = contactData.find(c => c.localId === o.contactId)!;
    const contactRecord = await prisma.contact.findFirst({ where: { workspaceId: WS_ID, waPhone: contact.waPhone } });
    if (!contactRecord) continue;

    // Make sure conversation exists (some orders reference convs we created in bulk)
    let convRecord = await prisma.conversation.findUnique({ where: { id: o.convId } });
    if (!convRecord) {
      convRecord = await prisma.conversation.upsert({
        where: { id: o.convId },
        update: {},
        create: {
          id: o.convId,
          workspaceId: WS_ID,
          contactId: contactRecord.id,
          status: 'resolved',
          aiEnabled: true,
          lastMessageAt: daysAgo(o.idx),
          lastMessagePreview: 'Order confirmed',
          unreadCount: 0,
          lostSaleStatus: 'not_lost',
        },
      });
    }

    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        workspaceId: WS_ID,
        contactId: contactRecord.id,
        conversationId: convRecord.id,
        orderNumber: o.num,
        status: o.status,
        totalCents: o.total,
        currency: 'PKR',
        deliveryAddress: o.addr,
        createdVia: o.via,
        fraudScore: o.fraud,
        fraudSignals: o.signals,
        createdAt: daysAgo(o.idx),
        items: {
          create: [
            {
              workspaceId: WS_ID,
              name: o.idx % 2 === 0 ? 'Lawn Suit — Navy Blue' : 'White Kameez',
              quantity: o.idx % 3 === 0 ? 2 : 1,
              unitPriceCents: o.idx % 2 === 0 ? 350000n : 180000n,
              lineTotalCents: o.total,
            },
          ],
        },
      },
    });
  }
  console.log('Seeded 12 orders');

  console.log('\nSeed complete! Summary:');
  console.log(`  Workspace: ${workspace.name}`);
  console.log(`  Products: ${productData.length}`);
  console.log(`  Contacts: ${contactData.length}`);
  console.log(`  Rules: ${rules.length}`);
  console.log(`  Flows: ${flows.length}`);
  console.log(`  Orders: ${orderData.length}`);
  console.log(`  KB Documents: 2`);
  console.log(`  Lost sale convs: 3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
