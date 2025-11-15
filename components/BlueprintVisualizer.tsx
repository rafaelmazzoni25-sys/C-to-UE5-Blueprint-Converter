import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphData, GraphNode } from '../services/geminiService';
import { PaletteIcon, XIcon } from './icons';

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

const NodeDetailPanel = ({ node, graphData, onClose, nodeMap }: { node: GraphNode, graphData: GraphData, onClose: () => void, nodeMap: Map<string, GraphNode> }) => {
    const incomingConnections = graphData.connections.filter(c => c.toNodeId === node.id);
    const outgoingConnections = graphData.connections.filter(c => c.fromNodeId === node.id);

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-800/95 border-l border-slate-600 shadow-2xl z-30 p-4 text-white flex flex-col transition-transform transform translate-x-0">
            <div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-4">
                <h3 className="text-lg font-bold text-teal-300">{node.name}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                <div className="mb-4">
                    <h4 className="font-semibold text-slate-400 text-sm mb-1">Tipo</h4>
                    <p className="text-sm capitalize bg-slate-700/50 px-2 py-1 rounded-md inline-block">{node.type.replace(/_/g, ' ')}</p>
                </div>
                {node.properties?.value && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-slate-400 text-sm mb-1">Valor</h4>
                        <p className="text-sm bg-slate-700/50 px-2 py-1 rounded-md">{node.properties.value}</p>
                    </div>
                )}
                <div className="mb-4">
                    <h4 className="font-semibold text-slate-400 text-sm mb-2">Conexões</h4>
                    <div className="text-xs space-y-2">
                        <p className="font-bold">Entrada:</p>
                        {incomingConnections.length > 0 ? (
                            <ul className="list-disc list-inside pl-2">
                                {incomingConnections.map((c, i) => <li key={i}>{nodeMap.get(c.fromNodeId)?.name} ({c.type})</li>)}
                            </ul>
                        ) : <p className="pl-2">Nenhuma</p>}
                        <p className="font-bold pt-2">Saída:</p>
                        {outgoingConnections.length > 0 ? (
                             <ul className="list-disc list-inside pl-2">
                                {outgoingConnections.map((c, i) => <li key={i}>{nodeMap.get(c.toNodeId)?.name} ({c.type})</li>)}
                            </ul>
                        ) : <p className="pl-2">Nenhuma</p>}
                    </div>
                </div>

                {node.codeSnippet && (
                    <div>
                        <h4 className="font-semibold text-slate-400 text-sm mb-1">Trecho de Código C++</h4>
                        <pre className="bg-slate-900 p-2 rounded-md text-xs font-mono overflow-x-auto">
                            <code>{node.codeSnippet}</code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};


export const BlueprintVisualizer: React.FC<BlueprintVisualizerProps> = ({ graphData }) => {
    const [localGraphData, setLocalGraphData] = useState<GraphData>(graphData);
    const [viewTransform, setViewTransform] = useState({ x: 50, y: 50, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [draggingNode, setDraggingNode] = useState<{ id: string; initialX: number; initialY: number; } | null>(null);
    const [nodeColors, setNodeColors] = useState(INITIAL_NODE_COLORS);
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const interactionStartRef = useRef({ x: 0, y: 0 });
    const wasDraggedRef = useRef(false);

    useEffect(() => {
        setLocalGraphData(graphData);
        setViewTransform({ x: 50, y: 50, scale: 1 });
        setSelectedNode(null);
    }, [graphData]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        const node = localGraphData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        setDraggingNode({ id: nodeId, initialX: node.x, initialY: node.y });
        interactionStartRef.current = { x: e.clientX, y: e.clientY };
        wasDraggedRef.current = false;
    }, [localGraphData.nodes]);
    
    const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setIsPanning(true);
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
            setSelectedNode(null);
            setIsColorPickerVisible(false);
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const dx = e.clientX - interactionStartRef.current.x;
        const dy = e.clientY - interactionStartRef.current.y;

        if (draggingNode) {
            if(Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                wasDraggedRef.current = true;
            }

            const newX = draggingNode.initialX + dx / viewTransform.scale;
            const newY = draggingNode.initialY + dy / viewTransform.scale;
            
            setLocalGraphData(prevData => ({
                ...prevData,
                nodes: prevData.nodes.map(node =>
                    node.id === draggingNode.id ? { ...node, x: newX, y: newY } : node
                )
            }));
        } else if (isPanning) {
            setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [draggingNode, isPanning, viewTransform.scale]);

    const handleMouseUp = useCallback(() => {
        if (draggingNode && !wasDraggedRef.current) {
            const node = localGraphData.nodes.find(n => n.id === draggingNode.id);
            setSelectedNode(node || null);
        }
        setIsPanning(false);
        setDraggingNode(null);
    }, [draggingNode, localGraphData.nodes]);

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
                        {Object.entries(INITIAL_NODE_COLORS).map(([type, _]) => (
                            <div key={type} className="flex items-center justify-between">
                                <span className="text-slate-300 text-xs capitalize mr-2">{type.replace(/_/g, ' ')}</span>
                                <input
                                    type="color"
                                    value={nodeColors[type as keyof typeof nodeColors] || nodeColors.default}
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
                    <marker id="arrow-exec" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
                    </marker>
                    <marker id="arrow-data" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3498DB" />
                    </marker>
                </defs>
                <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
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

                        return ( <path key={`${conn.fromNodeId}-${conn.toNodeId}-${index}`} d={pathData} stroke={conn.type === 'exec' ? 'white' : '#3498DB'} strokeWidth={conn.type === 'exec' ? 2.5 : 2} fill="none" markerEnd={conn.type === 'exec' ? "url(#arrow-exec)" : "url(#arrow-data)"} /> );
                    })}

                    {localGraphData.nodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} className="cursor-grab">
                            {selectedNode?.id === node.id && (
                                <rect width={NODE_WIDTH + 8} height={TOTAL_NODE_HEIGHT + 8} x="-4" y="-4" rx="12" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeDasharray="4 4" >
                                     <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.5s" repeatCount="indefinite" />
                                </rect>
                            )}
                            <rect width={NODE_WIDTH} height={TOTAL_NODE_HEIGHT} rx="8" fill="#2C3E50" stroke="#1C2833" strokeWidth="1" />
                            <rect width={NODE_WIDTH} height={NODE_HEADER_HEIGHT} rx="8" ry="8" fill={nodeColors[node.type as keyof typeof nodeColors] || nodeColors.default} />
                            <text x={NODE_WIDTH / 2} y={NODE_HEADER_HEIGHT / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="bold" className="pointer-events-none select-none" >
                                {node.name}
                            </text>
                            <circle cx={0} cy={NODE_HEADER_HEIGHT/2} r="5" fill={nodeColors.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT/2} r="5" fill={nodeColors.flow_control} stroke="white" strokeWidth="1" />
                            <circle cx={0} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                            <circle cx={NODE_WIDTH} cy={NODE_HEADER_HEIGHT + NODE_PIN_AREA_HEIGHT} r="5" fill="#3498DB" />
                        </g>
                    ))}
                </g>
            </svg>
            {selectedNode && <NodeDetailPanel node={selectedNode} graphData={localGraphData} onClose={() => setSelectedNode(null)} nodeMap={nodeMap} />}
        </div>
    );
};