import { apiClient } from '@/lib/api-client';
import { ConversationList, type ConversationItem } from '@/components/inbox/conversation-list';

interface Workspace {
  id: string;
  name: string;
}

interface ConversationsResponse {
  items: ConversationItem[];
  total: number;
}

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  let workspaceId = '';
  let initialConversations: ConversationItem[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      const data = await apiClient<ConversationsResponse>(
        '/conversations?page=1&limit=50',
        { workspaceId: workspace.id },
      );
      initialConversations = data.items;
    }
  } catch {
    // render empty state — user may not have a workspace yet
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        initialConversations={initialConversations}
        workspaceId={workspaceId}
      />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
