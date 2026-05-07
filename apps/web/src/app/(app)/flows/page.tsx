import { apiClient } from '@/lib/api-client';
import { FlowCanvas } from '@/components/flows/flow-canvas';
import type { Node, Edge } from '@xyflow/react';

interface Workspace { id: string }

interface FlowItem {
  id: string;
  name: string;
  description: string | null;
  graph: { nodes: Node[]; edges: Edge[] };
  isActive: boolean;
}

export default async function FlowsPage() {
  let workspaceId = '';
  let flows: FlowItem[] = [];

  try {
    const workspaces = await apiClient<Workspace[]>('/workspaces/me');
    const workspace = workspaces[0];
    if (workspace) {
      workspaceId = workspace.id;
      flows = await apiClient<FlowItem[]>('/flows', { workspaceId });
    }
  } catch {
    // show empty
  }

  return (
    <div className="h-full flex flex-col">
      {flows.length === 0 ? (
        <div className="px-7 pt-7 pb-7 flex-1 flex flex-col">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">Flow Builder</h1>
            <p className="text-sm text-slate-500 mt-1">Visual automation flows. Execution engine coming in v2.</p>
          </div>
          <div
            className="flex-1 rounded-2xl flex items-center justify-center"
            style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[13px] text-slate-400 font-medium">No flows yet. Seed the database to see demo flows.</p>
          </div>
        </div>
      ) : (
        <FlowCanvas workspaceId={workspaceId} flows={flows} />
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
