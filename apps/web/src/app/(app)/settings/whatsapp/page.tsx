import { apiClient } from '@/lib/api-client';
import { WhatsAppSettingsClient } from '@/components/settings/whatsapp-settings-client';

interface Workspace {
  id: string;
  phoneNumberId: string | null;
  wabaId: string | null;
}

export default async function WhatsAppSettingsPage() {
  let workspace: Workspace | null = null;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    workspace = workspaces[0] ?? null;
  } catch {
    // show empty
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const webhookUrl = `${apiUrl}/webhooks/whatsapp`;

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-xl">
      <WhatsAppSettingsClient workspace={workspace} webhookUrl={webhookUrl} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
