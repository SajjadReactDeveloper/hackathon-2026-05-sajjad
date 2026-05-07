'use client';

import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { browserApiClient } from '@/lib/browser-api-client';

interface FlowItem {
  id: string;
  name: string;
  description: string | null;
  graph: { nodes: Node[]; edges: Edge[] };
  isActive: boolean;
}

interface Props {
  workspaceId: string;
  flows: FlowItem[];
}

const NODE_COLORS: Record<string, string> = {
  trigger: '#16a34a',
  sendMessage: '#2563eb',
  sendAudio: '#7c3aed',
  transcribeAudio: '#ea580c',
  parseOrder: '#0891b2',
  tagContact: '#d97706',
  condition: '#6b7280',
};

function nodeColor(node: Node) {
  return NODE_COLORS[node.type ?? ''] ?? '#6b7280';
}

export function FlowCanvas({ workspaceId, flows }: Props) {
  const [selectedFlow, setSelectedFlow] = useState<FlowItem | null>(flows[0] ?? null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    (selectedFlow?.graph.nodes ?? []).map((n) => ({
      ...n,
      style: {
        background: nodeColor(n),
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '12px',
        fontWeight: 600,
        minWidth: 160,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    selectedFlow?.graph.edges ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function loadFlow(flow: FlowItem) {
    setSelectedFlow(flow);
    setNodes(
      (flow.graph.nodes ?? []).map((n) => ({
        ...n,
        style: {
          background: nodeColor(n),
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '12px',
          fontWeight: 600,
          minWidth: 160,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        },
      })),
    );
    setEdges(flow.graph.edges ?? []);
  }

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  );

  async function handleSave() {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      await browserApiClient(`/flows/${selectedFlow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ graph: { nodes, edges } }),
        workspaceId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — flow list */}
      <div className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Flows</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {flows.map((flow) => (
            <button
              key={flow.id}
              onClick={() => loadFlow(flow)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                selectedFlow?.id === flow.id ? 'bg-green-50 border-r-2 border-green-500' : ''
              }`}
            >
              <p className={`text-sm font-medium truncate ${selectedFlow?.id === flow.id ? 'text-green-700' : 'text-gray-900'}`}>
                {flow.name}
              </p>
              {flow.description && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{flow.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${flow.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-400">{flow.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">Execution engine coming in v2. Flows are visual references for now.</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFlow ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{selectedFlow.name}</h3>
                {selectedFlow.description && (
                  <p className="text-xs text-gray-400">{selectedFlow.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{nodes.length} nodes · {edges.length} edges</span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>

            <div className="flex-1">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                defaultEdgeOptions={{ animated: true, style: { stroke: '#16a34a', strokeWidth: 2 } }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
                <Controls
                  style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}
                />
                <MiniMap
                  nodeColor={nodeColor}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  maskColor="rgba(0,0,0,0.04)"
                />
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a flow from the sidebar to view it.
          </div>
        )}
      </div>
    </div>
  );
}
