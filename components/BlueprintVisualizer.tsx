import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GraphData, GraphNode, GraphPin } from '../services/geminiService';
import { PaletteIcon, XIcon } from './icons';

interface BlueprintVisualizerProps {
  graphData: GraphData;
  isInteractive?: boolean;
}

const NODE_WIDTH = 220;
const NODE_HEADER_HEIGHT = 30;
const PIN_HEIGHT = 22;
const PIN_OFFSET_Y = 10;
const PIN_TEXT_OFFSET = 15;
const PIN_SIZE = 6;

const INITIAL_NODE_COLORS = {
  event: '#A93226',
  function: '#1F618D',
  flow_control: '#7D3C98',
  variable_get: '#148F77',
  variable_set: '#117A65',
  literal: '#1E8449',
  default: '#566573',
};

const DATA_TYPE_COLORS: { [key: string]: string } = {
    'Exec': '#FFFFFF',
    'Boolean': '#C0392B',
    'Integer': '#2ECC71',
    'Float': '#1ABC9C',
    'String': '#F39C12',
    'Name': '#D2B4DE',
    'Vector': '#F1C40F',
    'Rotator': '#A569BD',
    'Transform': '#E67E22',
    'Object': '#3498DB',
    'default': '#95A5A6'
};

const calculateNodeHeight = (node: GraphNode) => {
    const inputPins = node.pins.filter(p => p.direction === 'in').length;
    const outputPins = node.pins.filter(p => p.direction === 'out').length;
    return NODE_HEADER_HEIGHT + PIN_OFFSET_Y + Math.max(inputPins, outputPins) * PIN_HEIGHT;
};

const getPinPosition = (node: GraphNode, pinId: string): { x: number, y: number } => {
    const pin = node.pins.find(p => p.id === pinId);
    if (!pin) return { x: node.x, y: node.y };

    const pinsInSameDirection = node.pins.filter(p => p.direction === pin.direction);
    const pinIndex = pinsInSameDirection.findIndex(p => p.id === pinId);

    const x = pin.direction === 'in' ? node.x : node.x + NODE_WIDTH;
    const y = node.y + NODE_HEADER_HEIGHT + PIN_OFFSET_Y + (pinIndex * PIN_HEIGHT) + (PIN_HEIGHT / 2);

    return { x, y };
};


const NodeDetailPanel = ({ node, graphData, onClose }: { node: GraphNode, graphData: GraphData, onClose: () => void }) => {
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
                    <h4 className="font-semibold text-slate-400 text-sm mb-2">Pinos</h4>
                     {node.pins.map(pin => (
                        <div key={pin.id} className="text-xs mb-1 flex items-center">
                            <div className="w-4 h-4 mr-2 flex items-center justify-center">
                                {pin.direction === 'in' ? '→' : '←'}
                            </div>
                            <span className="font-bold mr-2" style={{color: DATA_TYPE_COLORS[pin.dataType] || DATA_TYPE_COLORS.default}}>{pin.dataType}</span>
                            <span>{pin.name || '(Exec)'}</span>
                        </div>
                     ))}
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


export const BlueprintVisualizer: React.FC<BlueprintVisualizerProps> = ({ graphData, isInteractive = true }) => {
    const [localGraphData, setLocalGraphData] = useState<GraphData>(graphData);
    const [viewTransform, setViewTransform] = useState({ x: 50, y: 50, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [draggingNode, setDraggingNode] = useState<{ id: string; initialX: number; initialY: number; } | null>(null);
    const [nodeColors, setNodeColors] = useState(INITIAL_NODE_COLORS);
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const interactionStartRef = useRef({ x: 0, y: 0 });
    const wasDraggedRef = useRef(false);

    useEffect(() => {
        setLocalGraphData(graphData);
        setSelectedNode(null);

        if (!isInteractive) {
            // Auto-fit logic
            if (graphData.nodes.length > 0 && containerRef.current) {
                const PADDING = 50;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                graphData.nodes.forEach(node => {
                    const nodeHeight = calculateNodeHeight(node);
                    minX = Math.min(minX, node.x);
                    minY = Math.min(minY, node.y);
                    maxX = Math.max(maxX, node.x + NODE_WIDTH);
                    maxY = Math.max(maxY, node.y + nodeHeight);
                });

                const graphWidth = maxX - minX;
                const graphHeight = maxY - minY;
                
                const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
                
                if (graphWidth > 0 && graphHeight > 0) {
                    const scaleX = (containerWidth - PADDING * 2) / graphWidth;
                    const scaleY = (containerHeight - PADDING * 2) / graphHeight;
                    const scale = Math.min(scaleX, scaleY, 1); // Cap scale at 1

                    const newX = (containerWidth - graphWidth * scale) / 2 - minX * scale;
                    const newY = (containerHeight - graphHeight * scale) / 2 - minY * scale;
                    
                    setViewTransform({ x: newX, y: newY, scale });
                }
            }
        } else {
             setViewTransform({ x: 50, y: 50, scale: 1 });
        }
    }, [graphData, isInteractive]);
    
    const nodeMap = useRef(new Map<string, GraphNode>()).current;
    const pinMap = useRef(new Map<string, GraphPin>()).current;
    const pinToNodeMap = useRef(new Map<string, GraphNode>()).current;

    useEffect(() => {
        nodeMap.clear();
        pinMap.clear();
        pinToNodeMap.clear();
        localGraphData.nodes.forEach(node => {
            nodeMap.set(node.id, node);
            node.pins.forEach(pin => {
                pinMap.set(pin.id, pin);
                pinToNodeMap.set(pin.id, node);
            });
        });
    }, [localGraphData.nodes, nodeMap, pinMap, pinToNodeMap]);


    const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        if (!isInteractive) return;
        e.stopPropagation();
        const node = nodeMap.get(nodeId);
        if (!node) return;
        setDraggingNode({ id: nodeId, initialX: node.x, initialY: node.y });
        interactionStartRef.current = { x: e.clientX, y: e.clientY };
        wasDraggedRef.current = false;
    }, [nodeMap, isInteractive]);
    
    const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isInteractive) return;
        if (e.target === e.currentTarget) {
            setIsPanning(true);
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
            setSelectedNode(null);
            setIsColorPickerVisible(false);
        }
    }, [isInteractive]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isInteractive) return;
        const dx = e.clientX - interactionStartRef.current.x;
        const dy = e.clientY - interactionStartRef.current.y;

        if (draggingNode) {
            if(Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                wasDraggedRef.current = true;
                 setSelectedNode(null);
            }

            const newX = draggingNode.initialX + dx / viewTransform.scale;
            const newY = draggingNode.initialY + dy / viewTransform.scale;
            
            setLocalGraphData(prevData => {
                 const newNodes = prevData.nodes.map(node =>
                    node.id === draggingNode.id ? { ...node, x: newX, y: newY } : node
                );
                return {...prevData, nodes: newNodes};
            });
        } else if (isPanning) {
            setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            interactionStartRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [draggingNode, isPanning, viewTransform.scale, isInteractive]);

    const handleMouseUp = useCallback(() => {
        if (!isInteractive) return;
        if (draggingNode && !wasDraggedRef.current) {
            const node = nodeMap.get(draggingNode.id);
            setSelectedNode(node || null);
        }
        setIsPanning(false);
        setDraggingNode(null);
    }, [draggingNode, nodeMap, isInteractive]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!isInteractive) return;
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
    }, [viewTransform, isInteractive]);
    
    if (!localGraphData || !localGraphData.nodes || localGraphData.nodes.length === 0) {
        return <div className="p-4 text-slate-500">Não há dados para visualizar.</div>;
    }
    
    const cursorClass = isInteractive ? (isPanning || draggingNode ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default';

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full bg-slate-900/70 rounded-md overflow-hidden ${cursorClass}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {isInteractive && (
                <>
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
                </>
            )}

            <svg ref={svgRef} width="100%" height="100%" onMouseDown={handleBackgroundMouseDown}>
                <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
                    {localGraphData.connections.map((conn, index) => {
                        const fromNode = pinToNodeMap.get(conn.fromPinId);
                        const toNode = pinToNodeMap.get(conn.toPinId);
                        const fromPin = pinMap.get(conn.fromPinId);
                        if (!fromNode || !toNode || !fromPin) return null;
                        
                        const start = getPinPosition(fromNode, conn.fromPinId);
                        const end = getPinPosition(toNode, conn.toPinId);
                        
                        const c1x = start.x + Math.abs(end.x - start.x) * 0.6;
                        const c1y = start.y;
                        const c2x = end.x - Math.abs(end.x - start.x) * 0.6;
                        const c2y = end.y;

                        const pathData = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
                        const strokeColor = fromPin.type === 'exec' ? '#FFFFFF' : (DATA_TYPE_COLORS[fromPin.dataType] || DATA_TYPE_COLORS.default);
                        const strokeWidth = fromPin.type === 'exec' ? 2.5 : 2;

                        return ( <path key={`${conn.fromPinId}-${conn.toPinId}-${index}`} d={pathData} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" /> );
                    })}

                    {localGraphData.nodes.map(node => {
                        const nodeHeight = calculateNodeHeight(node);
                        const nodeCursorClass = isInteractive ? 'cursor-grab' : 'cursor-default';
                        return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} className={nodeCursorClass}>
                            {isInteractive && selectedNode?.id === node.id && (
                                <rect width={NODE_WIDTH + 8} height={nodeHeight + 8} x="-4" y="-4" rx="12" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeDasharray="4 4" >
                                     <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.5s" repeatCount="indefinite" />
                                </rect>
                            )}
                            <rect width={NODE_WIDTH} height={nodeHeight} rx="8" fill="#2C3E50" stroke="#1C2833" strokeWidth="1.5" />
                            <rect width={NODE_WIDTH} height={NODE_HEADER_HEIGHT} rx="8" ry="8" fill={nodeColors[node.type as keyof typeof nodeColors] || nodeColors.default} />
                            <text x={NODE_WIDTH / 2} y={NODE_HEADER_HEIGHT / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="bold" className="pointer-events-none select-none" >
                                {node.name}
                            </text>

                            {node.pins.map(pin => {
                                const pos = getPinPosition(node, pin.id);
                                const pinY = pos.y - node.y;
                                const pinColor = DATA_TYPE_COLORS[pin.dataType] || DATA_TYPE_COLORS.default;
                                return (
                                <g key={pin.id}>
                                    {pin.type === 'exec' ? (
                                        <path 
                                            d={pin.direction === 'in' ? `M ${-PIN_SIZE} ${pinY-PIN_SIZE} H ${PIN_SIZE} L ${PIN_SIZE*2} ${pinY} L ${PIN_SIZE} ${pinY+PIN_SIZE} H ${-PIN_SIZE} Z` : `M ${NODE_WIDTH-PIN_SIZE} ${pinY-PIN_SIZE} H ${NODE_WIDTH+PIN_SIZE} L ${NODE_WIDTH+PIN_SIZE*2} ${pinY} L ${NODE_WIDTH+PIN_SIZE} ${pinY+PIN_SIZE} H ${NODE_WIDTH-PIN_SIZE} Z`}
                                            fill={pinColor}
                                        />
                                    ) : (
                                        <circle cx={pin.direction === 'in' ? 0 : NODE_WIDTH} cy={pinY} r={PIN_SIZE} fill={pinColor} />
                                    )}
                                    <text
                                        x={pin.direction === 'in' ? PIN_TEXT_OFFSET : NODE_WIDTH - PIN_TEXT_OFFSET}
                                        y={pinY}
                                        textAnchor={pin.direction === 'in' ? 'start' : 'end'}
                                        dominantBaseline="middle"
                                        fill="#E0E0E0"
                                        fontSize="12"
                                        className="pointer-events-none select-none"
                                    >
                                        {pin.name}
                                    </text>
                                </g>
                                );
                            })}

                        </g>
                    )})}
                </g>
            </svg>
            {isInteractive && selectedNode && <NodeDetailPanel node={selectedNode} graphData={localGraphData} onClose={() => setSelectedNode(null)} />}
        </div>
    );
};