import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiCall<T>(
  path: string,
  options: RequestInit & { workspaceId?: string } = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  if (options.workspaceId) {
    headers['x-workspace-id'] = options.workspaceId;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── typed helpers ────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  phoneNumberId: string | null;
}

export interface Contact {
  id: string;
  displayName: string | null;
  profileName: string | null;
  waPhone: string;
  tags: string[];
  orderCount: number;
  lifetimeValueCents: string;
}

export interface Conversation {
  id: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  aiEnabled: boolean;
  contact: Contact;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  type: string;
  textBody: string | null;
  mediaUrl: string | null;
  transcription: string | null;
  aiGenerated: boolean;
  detectedLanguage: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: string;
  createdVia: string;
  fraudScore: number;
  deliveryAddress: string | null;
  createdAt: string;
  contact: Contact;
  items: Array<{ name: string; quantity: number; lineTotalCents: string }>;
}

export interface DashboardTiles {
  todayRevenueCents: number;
  weekRevenueCents: number;
  monthRevenueCents: number;
  totalMessages: number;
  aiReplyRate: number;
  openConversations: number;
  totalOrders: number;
}
