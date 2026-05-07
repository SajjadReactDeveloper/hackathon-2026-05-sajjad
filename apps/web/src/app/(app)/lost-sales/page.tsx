import { apiClient } from '@/lib/api-client';
import { LostSalesClient } from '@/components/lost-sales/lost-sales-client';

interface Workspace { id: string }

interface Contact {
  id: string;
  waPhone: string;
  displayName: string | null;
}

interface LostSaleConversation {
  id: string;
  lostSaleStatus: 'pending_analysis' | 'analyzed' | 'recovered';
  lostSaleReason: string | null;
  lostSaleSuggestion: string | null;
  lostSaleAnalyzedAt: string | null;
  lastMessageAt: string;
  contact: Contact;
}

export default async function LostSalesPage() {
  let workspaceId = '';
  let conversations: LostSaleConversation[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      conversations = await apiClient<LostSaleConversation[]>('/lost-sales', { workspaceId });
    }
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-2xl">
      <LostSalesClient workspaceId={workspaceId} initialConversations={conversations} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
