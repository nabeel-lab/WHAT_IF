'use client';

import { ReactNode } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ConnectionLineType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface SpatialCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: Record<string, any>;
  edgeTypes?: Record<string, any>;
  onNodesChange?: any;
  onEdgesChange?: any;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  children?: ReactNode;
}

// Design spec colors
const CANVAS_BG = '#0B0F14';
const GLASS_SURFACE = '#151C25';
const MUTED_TEXT = '#A8B4C2';

export default function SpatialCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  children,
}: SpatialCanvasProps) {
  
  return (
    <div 
      className="w-full h-full relative"
      style={{ backgroundColor: CANVAS_BG }}
    >
      {/* Subtle atmospheric depth - very restrained */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${GLASS_SURFACE}40, transparent 70%)`
        }}
      />
      
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: MUTED_TEXT + '40',
            strokeWidth: 1.5,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Subtle grid background for spatial orientation */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1}
          color={MUTED_TEXT}
          className="opacity-[0.08]"
        />
        
        {/* Glass controls - hidden in favor of custom toolbar */}
        <Controls
          className="hidden"
        />
        
        {/* MiniMap with design spec colors */}
        <MiniMap
          style={{
            backgroundColor: GLASS_SURFACE + 'E6',
            border: `1px solid ${MUTED_TEXT}30`,
            backdropFilter: 'blur(12px)',
          }}
          className="!shadow-2xl !rounded-xl"
          maskColor={CANVAS_BG + 'CC'}
          nodeColor={(node) => {
            const data = node.data;
            // Use design spec colors
            if (data.evidenceState?.runtimeObserved) return '#60F1D0'; // evidence teal
            if (data.evidenceState?.reachable) return '#FFBF72'; // key amber
            return MUTED_TEXT + '80';
          }}
        />

        {children}
      </ReactFlow>
    </div>
  );
}
