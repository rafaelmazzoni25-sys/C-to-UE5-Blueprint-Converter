import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    // Use local state to allow for interactive modifications like dragging.
    const [localGraphData, setLocalGraphData] = useState<GraphData>(graphData);
    
    // State to track the node being dragged.
    const [draggingNode, setDraggingNode] = useState<{
        id: string; // ID of the node being dragged
        offsetX: number; // Mouse offset from the node's top-left corner
        offsetY: number;
    } | null>(null);
    
    const svgRef = useRef<SVGSVGElement>(null);

    // Synchronize local state with incoming props. This is crucial for when
    // a new blueprint is generated.
    useEffect(() => {
        setLocalGraphData(graphData);
    }, [graphData]);

    // Helper function to get mouse coordinates relative to the SVG canvas.
    const getSVGPoint = useCallback((e: React.MouseEvent): { x: number; y: number } => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const point = svgRef.current.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const ctm = svgRef.current.getScreenCTM()?.inverse();
        if (ctm) {
            return point.matrixTransform(ctm);
        }
        return { x: 0, y: 0 };
    }, []);

    // Initiates a drag operation when the user clicks on a node.
    const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        const node = localGraphData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        e.preventDefault();
        
        const point = getSVGPoint(e);
        setDraggingNode({
            id: nodeId,
            offsetX: point.x - node.x,
            offsetY: point.y - node.y,
        });
    }, [localGraphData.nodes, getSVGPoint]);

    // Updates the position of the dragged node as the mouse moves.
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!draggingNode) return;
        e.preventDefault();

        const point = getSVGPoint(e);
        const newX = point.x - draggingNode.offsetX;
        const newY = point.y - draggingNode.offsetY;

        setLocalGraphData(prevData => {
            const newNodes = prevData.nodes.map(node =>
                node.id === draggingNode.id ? { ...node, x: newX, y: newY } : node
            );
            return { ...prevData, nodes: newNodes };
        });
    }, [draggingNode, getSVGPoint]);

    // Ends the drag operation when the user releases the mouse button.
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setDraggingNode(null);
    }, []);
    
    if (!localGraphData || !localGraphData.nodes || localGraphData.nodes.length === 0) {
        return <div className="p-4 text-slate-500">Não há dados para visualizar.</div>;
    }

    // A map for quick node lookups when rendering connections.
    const nodeMap = new Map<string, GraphNode>(localGraphData.nodes.map(node => [node.id, node]));

    // Dynamically calculate the SVG viewbox to fit all content.
    let maxX = 0;
    let maxY = 0;
    localGraphData.nodes.forEach(node => {
        if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH;
        if (node.y + TOTAL_NODE_HEIGHT > maxY) maxY = node.y + TOTAL_NODE_HEIGHT;
    });
    const padding = 50;
    const viewBoxWidth = Math.max(maxX + padding * 2, 500); // Ensure a minimum width
    const viewBoxHeight = Math.max(maxY + padding * 2, 500); // Ensure a minimum height

    return (
        <div
            className={`w-full h-full bg-slate-900/70 rounded-md overflow-auto ${draggingNode ? 'cursor-grabbing' : ''}`}
            // These event handlers are on the container to capture mouse events
            // even if the cursor moves off the dragged node.
            onMouseMove={draggingNode ? handleMouseMove : undefined}
            onMouseUp={draggingNode ? handleMouseUp : undefined}
            onMouseLeave={draggingNode ? handleMouseUp : undefined}
        >
            <svg ref={svgRef} width={viewBoxWidth} height={viewBoxHeight} className="min-w-full min-h-full">
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
                <g transform={`translate(${padding}, ${padding})`}>
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
                    {localGraphData.nodes.map(node => (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
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
                                fill={NODE_COLORS[node.type as keyof typeof NODE_COLORS] || NODE_COLORS.default}
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
