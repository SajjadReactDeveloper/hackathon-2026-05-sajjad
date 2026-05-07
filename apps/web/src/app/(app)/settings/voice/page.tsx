import { apiClient } from '@/lib/api-client';
import { VoiceSettingsClient } from '@/components/settings/voice-settings-client';

interface Workspace {
  id: string;
  voiceCloneStatus: 'none' | 'training' | 'ready';
  voiceCloneId: string | null;
  aiConfig: {
    ttsProvider: 'openai' | 'elevenlabs';
    ttsVoice: string;
    ttsEnabled: boolean;
  } | null;
}

export default async function VoiceSettingsPage() {
  let workspace: Workspace | null = null;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    workspace = workspaces[0] ?? null;
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-xl">
      <VoiceSettingsClient workspace={workspace} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
