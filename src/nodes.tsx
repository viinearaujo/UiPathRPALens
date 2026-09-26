import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type WorkflowNodeData = {
  title: string;
  badges: string[];
  dimmed: boolean;
  unconnected: boolean;
};

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

export function WorkflowNodeView({ id, data }: NodeProps<WorkflowFlowNode>) {
  return (
    <div
      data-testid={`node-${id}`}
      data-unconnected={data.unconnected ? "true" : "false"}
      className="workflow-node"
      style={{ opacity: data.dimmed ? 0.25 : 1 }}
    >
      <Handle type="target" position={Position.Left} />
      <div>{data.title}</div>
      <div>
        {data.badges.map((badge) => (
          <span key={badge} className="badge">{badge}</span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function UnconnectedGroupView({ id }: NodeProps) {
  return (
    <div data-testid="unconnected-group" data-node={id} className="unconnected-group">
      <div className="group-title">Unconnected</div>
    </div>
  );
}
