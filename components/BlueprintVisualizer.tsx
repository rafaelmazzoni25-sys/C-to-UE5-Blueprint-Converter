import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphData, GraphNode } from '../services/geminiService';
import { PaletteIcon } from './icons'; // Import the new icon

interface BlueprintVisualizerProps {
  graphData: GraphData;
}

const NODE_WIDTH = 200;
const NODE_HEADER_HEIGHT = 30;
const NODE_PIN_AREA_HEIGHT = 20;
const TOTAL_NODE_HEIGHT = NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT * 2; // Simplified height

const INITIAL_NODE_COLORS = {
  event: '#C0392B',
  function: '#2980B9',
  flow_control: '#8E44AD',
  variable_get: '#16A085',
  variable_set: '#1ABC9C',
  literal: '#27AE60',
  default: '#7F8C8D',
};

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
    const [localGraphData, setLocalGraphData] = useState<GraphData>(graphData);
    const [viewTransform, setViewTransform] = useState({ x: 50, y: 50, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [draggingNode, setDraggingNode] = useState<{ id: string; initialX: number; initialY: number; } | null>(null);
    const [nodeColors, setNodeColors] = useState(INITIAL_NODE_COLORS);
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const interactionStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setLocalGraphData(graphData);
        setViewTransform({ x: 50, y: 50, scale: 1 });
    }, [graphData]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        const node = localGraphData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        setDraggingNode({ id: nodeId, initialX: node.x, initialY: node.y });
        interactionStartRef.current = { x: e.clientX, y: e.clientY };
    }, [localGraphData.nodes]);
    
    const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setIsPanning(true);
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (draggingNode) {
            const dx = (e.clientX - interactionStartRef.current.x) / viewTransform.scale;
            const dy = (e.clientY - interactionStartRef.current.y) / viewTransform.scale;
            
            setLocalGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(node =>
                    node.id === draggingNode.id
                        ? { ...node, x: draggingNode.initialX + dx, y: draggingNode.initialY + dy }
                        : node
                )
            }));
        } else if (isPanning) {
            const dx = e.clientX - interactionStartRef.current.x;
            const dy = e.clientY - interactionStartRef.current.y;
            
            setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [draggingNode, isPanning, viewTransform.scale]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setDraggingNode(null);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const newScale = viewTransform.scale * (1 - e.deltaY * 0.01 * zoomIntensity);
        const minScale = 0.1;
        const maxScale = 2.0;
        const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;

        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;

        const pointX = (mouseX - viewTransform.x) / viewTransform.scale;
        const pointY = (mouseY - viewTransform.y) / viewTransform.scale;

        const newX = mouseX - pointX * clampedScale;
        const newY = mouseY - pointY * clampedScale;

        setViewTransform({ x: newX, y: newY, scale: clampedScale });
    }, [viewTransform]);
    
    if (!localGraphData || !localGraphData.nodes || localGraphData.nodes.length === 0) {
        return <div className="p-4 text-slate-500">Não há dados para visualizar.</div>;
    }

    const nodeMap = new Map<string, GraphNode>(localGraphData.nodes.map(node => [node.id, node]));
    const cursorClass = isPanning ? 'cursor-grabbing' : draggingNode ? 'cursor-grabbing' : 'cursor-grab';

    return (
        <div
            className={`relative w-full h-full bg-slate-900/70 rounded-md overflow-hidden ${cursorClass}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            <div className="absolute top-2 right-2 z-20">
                <button
                    onClick={() => setIsColorPickerVisible(!isColorPickerVisible)}
                    className="p-2 bg-slate-700/80 hover:bg-slate-600 rounded-full text-white transition-colors"
                    title="Personalizar Cores dos Nós"
                >
                    <PaletteIcon className="w-5 h-5" />
                </button>
            </div>

            {isColorPickerVisible && (
                <div className="absolute top-14 right-2 z-20 bg-slate-800 border border-slate-600 p-4 rounded-lg shadow-xl w-64">
                    <h4 className="text-white font-bold mb-3 text-sm">Cores dos Nós</h4>
                    <div className="space-y-2">
                        {Object.entries(nodeColors).map(([type, color]) => (
                            <div key={type} className="flex items-center justify-between">
                                <span className="text-slate-300 text-xs capitalize mr-2">{type.replace(/_/g, ' ')}</span>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setNodeColors(prev => ({ ...prev, [type]: e.target.value }))}
                                    className="w-8 h-8 p-0 border-none rounded bg-transparent cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <svg 
                ref={svgRef} 
                width="100%" 
                height="100%" 
                onMouseDown={handleBackgroundMouseDown}
            >
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
                <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
                    {/* Connections */}
                    {localGraphData.connections.map((conn, index) => {
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
                                key={`${conn.fromNodeId}-${conn.toNodeId}-${index}`}
                                d={pathData}
                                stroke={conn.type === 'exec' ? 'white' : '#3498DB'}
                                strokeWidth={conn.type === 'exec' ? 2.5 : 2}
                                fill="none"
                                markerEnd={conn.type === 'exec' ? "url(#arrow-exec)" : "url(#arrow-data)"}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {localGraphData.nodes.map(node => (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            className="cursor-grab"
                        >
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
                                fill={nodeColors[node.type as keyof typeof nodeColors] || nodeColors.default}
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
                            <circle cx={0} cy={NODE_HEADER_HEIGHT/2} r="5" fill={nodeColors.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT/2} r="5" fill={nodeColors.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={0} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
};
