import { apiClient } from '@/lib/api-client';
import { AISettingsClient } from '@/components/settings/ai-settings-client';

interface AIConfig {
  autoReplyEnabled: boolean;
  systemPromptOverride: string | null;
  ttsEnabled: boolean;
  ttsProvider: 'openai' | 'elevenlabs';
  ttsVoice: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

interface Workspace {
  id: string;
  aiConfig: AIConfig | null;
}

export default async function AISettingsPage() {
  let workspace: Workspace | null = null;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    workspace = workspaces[0] ?? null;
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-xl">
      <AISettingsClient workspace={workspace} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
