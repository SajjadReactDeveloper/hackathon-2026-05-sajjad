import { apiClient } from '@/lib/api-client';
import { RulesClient } from '@/components/rules/rules-client';

interface Workspace { id: string }

interface AutoRule {
  id: string;
  name: string;
  triggerPattern: string;
  matchScope: 'text' | 'transcription' | 'any';
  replyTemplate: string | null;
  action: 'send_text' | 'tag_contact' | 'skip_ai';
  enabled: boolean;
  priority: number;
  createdAt: string;
}

export default async function RulesPage() {
  let workspaceId = '';
  let rules: AutoRule[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      rules = await apiClient<AutoRule[]>('/rules', { workspaceId });
    }
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-4xl">
      <RulesClient workspaceId={workspaceId} initialRules={rules} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
