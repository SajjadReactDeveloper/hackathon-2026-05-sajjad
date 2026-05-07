import { apiClient } from '@/lib/api-client';
import { BusinessSettingsClient } from '@/components/settings/business-settings-client';

interface Workspace {
  id: string;
  name: string;
  timezone: string;
  locale: string;
}

export default async function BusinessSettingsPage() {
  let workspace: Workspace | null = null;

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    workspace = workspaces[0] ?? null;
  } catch {
    // show empty
  }

  return (
    <div className="px-7 pt-7 pb-7 overflow-auto h-full max-w-xl">
      <BusinessSettingsClient workspace={workspace} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
