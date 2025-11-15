
import React from 'react';
import type { GraphData, GraphNode } from '../services/geminiService';

interface BlueprintVisualizerProps {
  graphData: GraphData;
}

const NODE_WIDTH = 200;
const NODE_HEADER_HEIGHT = 30;
const NODE_PIN_AREA_HEIGHT = 20;
const TOTAL_NODE_HEIGHT = NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT * 2; // Simplified height

const NODE_COLORS = {
  event: '#C0392B',
  function: '#2980B9',
  flow_control: '#8E44AD',
  variable_get: '#16A085',
  variable_set: '#1ABC9C',
  literal: '#27AE60',
  default: '#7F8C8D',
};

// FIX: The `type` parameter is changed to `string` to match the data from the API.
// The previous literal type was causing a TypeScript type inference issue.
const getPinPosition = (node: GraphNode, type: string, direction: 'in' | 'out') => {
    if (type === 'exec') {
        const y = node.y + NODE_HEADER_HEIGHT / 2;
        const x = direction === 'in' ? node.x : node.x + NODE_WIDTH;
        return { x, y };
    }
    // Data pins
    const y = node.y + NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT;
    const x = direction === 'in' ? node.x : node.x + NODE_WIDTH;
    return { x, y };
};

export const BlueprintVisualizer: React.FC<BlueprintVisualizerProps> = ({ graphData }) => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return <div className="p-4 text-slate-500">Não há dados para visualizar.</div>;
    }

    // FIX: Explicitly type `nodeMap` to prevent `nodeMap.get()` from returning `unknown`.
    const nodeMap = new Map<string, GraphNode>(graphData.nodes.map(node => [node.id, node]));

    // Calculate viewBox dimensions
    let maxX = 0;
    let maxY = 0;
    graphData.nodes.forEach(node => {
        if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH;
        if (node.y + TOTAL_NODE_HEIGHT > maxY) maxY = node.y + TOTAL_NODE_HEIGHT;
    });
    const padding = 50;
    const viewBoxWidth = maxX + padding * 2;
    const viewBoxHeight = maxY + padding;

    return (
        <div className="w-full h-full bg-slate-900/70 rounded-md overflow-auto">
            <svg width={viewBoxWidth} height={viewBoxHeight} className="min-w-full min-h-full">
                <defs>
                    <marker id="arrow-exec" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
                    </marker>
                    <marker id="arrow-data" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3498DB" />
                    </marker>
                </defs>
                <g transform={`translate(${padding}, ${padding / 2})`}>
                    {/* Connections */}
                    {graphData.connections.map((conn, index) => {
                        const fromNode = nodeMap.get(conn.fromNodeId);
                        const toNode = nodeMap.get(conn.toNodeId);

                        if (!fromNode || !toNode) return null;
                        
                        const start = getPinPosition(fromNode, conn.type, 'out');
                        const end = getPinPosition(toNode, conn.type, 'in');
                        
                        const c1x = start.x + Math.abs(end.x - start.x) * 0.5;
                        const c1y = start.y;
                        const c2x = end.x - Math.abs(end.x - start.x) * 0.5;
                        const c2y = end.y;

                        const pathData = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;

                        return (
                            <path
                                key={index}
                                d={pathData}
                                stroke={conn.type === 'exec' ? 'white' : '#3498DB'}
                                strokeWidth={conn.type === 'exec' ? 2.5 : 2}
                                fill="none"
                                markerEnd={conn.type === 'exec' ? "url(#arrow-exec)" : "url(#arrow-data)"}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {graphData.nodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            <rect
                                width={NODE_WIDTH}
                                height={TOTAL_NODE_HEIGHT}
                                rx="8"
                                fill="#2C3E50"
                                stroke="#1C2833"
                                strokeWidth="1"
                            />
                            <rect
                                width={NODE_WIDTH}
                                height={NODE_HEADER_HEIGHT}
                                rx="8"
                                ry="8"
                                fill={NODE_COLORS[node.type as keyof typeof NODE_COLORS] || NODE_COLORS.default}
                                className="cursor-pointer"
                            />
                            <text
                                x={NODE_WIDTH / 2}
                                y={NODE_HEADER_HEIGHT / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="14"
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                            >
                                {node.name}
                            </text>
                             {/* Simplified Pin Representation */}
                            <circle cx={0} cy={NODE_HEADER_HEIGHT/2} r="5" fill={NODE_COLORS.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT/2} r="5" fill={NODE_COLORS.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={0} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
};
