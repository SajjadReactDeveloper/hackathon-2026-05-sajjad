import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ThreadView, type MessageItem } from '@/components/inbox/thread-view';

interface Workspace {
  id: string;
}

interface ConversationData {
  id: string;
  aiEnabled: boolean;
  contact: {
    id: string;
    waPhone: string;
    displayName: string | null;
    profileName: string | null;
  };
}

interface MessagesResponse {
  items: MessageItem[];
  total: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;

  let workspaceId = '';
  let conversation: ConversationData | null = null;
  let initialMessages: MessageItem[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (!workspace) return notFound();
    workspaceId = workspace.id;

    const [convData, messagesData] = await Promise.all([
      apiClient<ConversationData>(`/conversations/${id}`, { workspaceId }),
      apiClient<MessagesResponse>(`/messages/conversation/${id}?page=1&limit=50`, { workspaceId }),
    ]);

    conversation = convData;
    initialMessages = messagesData.items;

    // mark as read (fire-and-forget; server component can't await safely without blocking)
    void apiClient(`/conversations/${id}/read`, { method: 'POST', workspaceId });
  } catch {
    return notFound();
  }

  if (!conversation) return notFound();

  return (
    <ThreadView
      initialMessages={initialMessages}
      conversationId={id}
      workspaceId={workspaceId}
      conversation={conversation}
    />
  );
}
