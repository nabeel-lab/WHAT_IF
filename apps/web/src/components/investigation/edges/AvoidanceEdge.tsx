import React, { useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useNodes } from 'reactflow';

const NODE_WIDTH = 320;
const NODE_HEIGHT = 140;

// Simple bounding box collision check
function intersectsAnyNode(
  x1: number, y1: number,
  x2: number, y2: number,
  nodes: any[],
  sourceId: string,
  targetId: string
) {
  const padding = 20;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (const node of nodes) {
    if (node.id === sourceId || node.id === targetId) continue;
    
    // Node bounds
    const nx1 = node.position.x - padding;
    const nx2 = node.position.x + (node.width || NODE_WIDTH) + padding;
    const ny1 = node.position.y - padding;
    const ny2 = node.position.y + (node.height || NODE_HEIGHT) + padding;

    // Check overlap
    if (maxX > nx1 && minX < nx2 && maxY > ny1 && minY < ny2) {
      return true; // Collision!
    }
  }
  return false;
}

// Generate SVG path avoiding nodes deterministically
function generateAvoidancePath(
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
  nodes: any[],
  sourceId: string,
  targetId: string
): string {
  // If adjacent lanes, just use standard smoothstep logic (via intermediate waypoints for corner rounding later)
  const laneDistance = Math.abs(targetX - sourceX);
  
  const midX = sourceX + (targetX - sourceX) / 2;
  
  // Try standard path first: go right to midX, vertical to targetY, right to targetX
  const standardCollision = 
    intersectsAnyNode(sourceX, sourceY, midX, sourceY, nodes, sourceId, targetId) ||
    intersectsAnyNode(midX, sourceY, midX, targetY, nodes, sourceId, targetId) ||
    intersectsAnyNode(midX, targetY, targetX, targetY, nodes, sourceId, targetId);

  if (!standardCollision) {
    return buildSVGPath([{x: sourceX, y: sourceY}, {x: midX, y: sourceY}, {x: midX, y: targetY}, {x: targetX, y: targetY}]);
  }

  // If collision, we need to route around.
  // We can route "above" or "below" the graph's current obstacles.
  // Find min/max Y of all nodes between sourceX and targetX
  let highestY = Infinity;
  let lowestY = -Infinity;

  for (const node of nodes) {
    if (node.id === sourceId || node.id === targetId) continue;
    const nx = node.position.x;
    if (nx > sourceX && nx < targetX) {
      highestY = Math.min(highestY, node.position.y);
      lowestY = Math.max(lowestY, node.position.y + (node.height || NODE_HEIGHT));
    }
  }

  // If no intermediate nodes found (shouldn't happen if we had a collision, but fallback)
  if (highestY === Infinity) {
    highestY = Math.min(sourceY, targetY) - 150;
    lowestY = Math.max(sourceY, targetY) + 150;
  }

  // Decide whether to go over or under.
  // Go the shorter vertical distance.
  const routeOver = sourceY < (highestY + lowestY) / 2;
  
  const routeY = routeOver ? highestY - 80 : lowestY + 80;
  
  const earlyDropX = sourceX + 60; // Just past the source node
  const lateRiseX = targetX - 60;  // Just before the target node

  const points = [
    { x: sourceX, y: sourceY },
    { x: earlyDropX, y: sourceY },
    { x: earlyDropX, y: routeY },
    { x: lateRiseX, y: routeY },
    { x: lateRiseX, y: targetY },
    { x: targetX, y: targetY }
  ];

  return buildSVGPath(points);
}

// Convert waypoints into an SVG path with rounded corners (smoothstep style)
function buildSVGPath(points: {x: number, y: number}[]): string {
  const radius = 20;
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];

    if (i === points.length - 1) {
      path += ` L ${p1.x} ${p1.y}`;
      break;
    }

    const p2 = points[i + 1];

    // Determine direction from p0 to p1
    const dx = Math.sign(p1.x - p0.x);
    const dy = Math.sign(p1.y - p0.y);

    // Determine direction from p1 to p2
    const ndx = Math.sign(p2.x - p1.x);
    const ndy = Math.sign(p2.y - p1.y);

    // Calculate start of curve (corner)
    const cx1 = p1.x - dx * radius;
    const cy1 = p1.y - dy * radius;
    
    // Draw line to start of curve
    path += ` L ${cx1} ${cy1}`;

    // Calculate end of curve
    const cx2 = p1.x + ndx * radius;
    const cy2 = p1.y + ndy * radius;
    
    // Draw quadratic curve
    path += ` Q ${p1.x} ${p1.y} ${cx2} ${cy2}`;
  }

  return path;
}

export default function AvoidanceEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
}: EdgeProps) {
  const nodes = useNodes();

  const [edgePath, labelX, labelY] = useMemo(() => {
    try {
      const path = generateAvoidancePath(sourceX, sourceY, targetX, targetY, nodes, source, target);
      
      // Calculate a rough midpoint for the label (usually the middle of the longest horizontal segment)
      const isRouteOver = sourceY < targetY; // Simplification just for label pos
      const labelXPos = sourceX + (targetX - sourceX) / 2;
      let labelYPos = sourceY;

      if (Math.abs(targetX - sourceX) > 600) {
          // It's a long route, try to place label in the middle of the routeY segment
          labelYPos = isRouteOver ? Math.min(sourceY, targetY) - 80 : Math.max(sourceY, targetY) + 80;
      } else {
          labelYPos = sourceY + (targetY - sourceY) / 2;
      }

      return [path, labelXPos, labelYPos];
    } catch (err) {
      // Fallback to standard smoothstep if something fails
      const fallback = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition
      });
      return [fallback[0], fallback[1], fallback[2]];
    }
  }, [sourceX, sourceY, targetX, targetY, nodes, source, target, sourcePosition, targetPosition]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} id={id} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: labelBgStyle?.fill || '#151C25',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${style?.stroke || '#A8B4C2'}40`,
              fontSize: labelStyle?.fontSize || 10,
              fontWeight: 600,
              color: labelStyle?.fill || '#A8B4C2',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
