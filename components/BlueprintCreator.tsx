import React, { useState, useCallback, useRef, useMemo } from 'react';
// FIX: Import `GraphPin` to use as a type annotation.
import { generateCppCode, GraphData, GraphNode, CppCodeResponse, GraphVariable, GraphPin } from '../services/geminiService';
import { BlueprintVisualizer } from './BlueprintVisualizer';
import { CppCodeDisplay } from './CppCodeDisplay';
import { MagicWandIcon, PlusIcon, TrashIcon, VariableIcon, BoltIcon, FunctionIcon, EditIcon, BlocksIcon } from './icons';

interface CustomEvent {
    id: string;
    name: string;
}

interface FunctionParameter {
    id: string;
    name: string;
    type: string;
}

interface CustomFunction {
    id: string;
    name: string;
    parameters: FunctionParameter[];
    returnType: string; // 'None' for no return
}

const initialGraphData: GraphData = {
    nodes: [
        {
            id: 'node-1',
            name: 'Event BeginPlay',
            type: 'event',
            x: 50,
            y: 200,
            pins: [{ id: 'pin-1', name: '', type: 'exec', direction: 'out', dataType: 'Exec' }],
        },
        {
            id: 'node-2',
            name: 'Print String',
            type: 'function',
            x: 350,
            y: 180,
            pins: [
                { id: 'pin-2', name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                { id: 'pin-3', name: '', type: 'exec', direction: 'out', dataType: 'Exec' },
                { id: 'pin-4', name: 'In String', type: 'data', direction: 'in', dataType: 'String' },
            ],
        },
         {
            id: 'node-3',
            name: 'Hello World',
            type: 'literal',
            x: 50,
            y: 350,
            properties: { value: "Loop starting!" },
            pins: [{ id: 'pin-5', name: 'Value', type: 'data', direction: 'out', dataType: 'String' }],
        },
        {
            id: 'node-4',
            name: 'Set Health',
            type: 'function',
            x: 950,
            y: 250,
            pins: [
                { id: 'pin-6', name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                { id: 'pin-7', name: 'New Health', type: 'data', direction: 'in', dataType: 'Integer' },
            ],
        },
        {
            id: 'node-5',
            name: 'For Loop',
            type: 'flow_control',
            x: 650,
            y: 180,
            pins: [
                { id: 'pin-8', name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                { id: 'pin-9', name: 'First Index', type: 'data', direction: 'in', dataType: 'Integer' },
                { id: 'pin-10', name: 'Last Index', type: 'data', direction: 'in', dataType: 'Integer' },
                { id: 'pin-11', name: 'Loop Body', type: 'exec', direction: 'out', dataType: 'Exec' },
                { id: 'pin-12', name: 'Index', type: 'data', direction: 'out', dataType: 'Integer' },
                { id: 'pin-13', name: 'Completed', type: 'exec', direction: 'out', dataType: 'Exec' },
            ],
        },
        {
            id: 'node-6',
            name: '0',
            type: 'literal',
            x: 400,
            y: 300,
            properties: { value: "0" },
            pins: [{ id: 'pin-14', name: 'Value', type: 'data', direction: 'out', dataType: 'Integer' }],
        },
        {
            id: 'node-7',
            name: '9',
            type: 'literal',
            x: 400,
            y: 400,
            properties: { value: "9" },
            pins: [{ id: 'pin-15', name: 'Value', type: 'data', direction: 'out', dataType: 'Integer' }],
        },
    ],
    connections: [
        { fromPinId: 'pin-1', toPinId: 'pin-2' }, // BeginPlay -> Print String
        { fromPinId: 'pin-5', toPinId: 'pin-4' }, // "Hello World" -> Print String
        { fromPinId: 'pin-3', toPinId: 'pin-8' }, // Print String -> For Loop
        { fromPinId: 'pin-11', toPinId: 'pin-6' }, // For Loop (Body) -> Set Health
        { fromPinId: 'pin-12', toPinId: 'pin-7' }, // For Loop (Index) -> Set Health (New Health)
        { fromPinId: 'pin-14', toPinId: 'pin-9' }, // 0 -> For Loop (First Index)
        { fromPinId: 'pin-15', toPinId: 'pin-10' }, // 9 -> For Loop (Last Index)
    ],
    variables: [
        { name: "PlayerHealth", type: "Integer" },
        { name: "IsAlive", type: "Boolean" }
    ],
};

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const variableTypes = ['Boolean', 'Integer', 'Float', 'String', 'Vector', 'Rotator', 'Transform', 'Name'];

const nodeLibrary = [
  {
    category: 'Flow Control',
    nodes: [
      { name: 'Branch', type: 'flow_control' as const, pins: [ { name: '', type: 'exec' as const, direction: 'in' as const, dataType: 'Exec' }, { name: 'Condition', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'True', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' }, { name: 'False', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' } ] },
      { name: 'Sequence', type: 'flow_control' as const, pins: [ { name: '', type: 'exec' as const, direction: 'in' as const, dataType: 'Exec' }, { name: 'Then 0', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' }, { name: 'Then 1', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' } ] },
      { name: 'For Loop', type: 'flow_control' as const, pins: [ { name: '', type: 'exec' as const, direction: 'in' as const, dataType: 'Exec' }, { name: 'First Index', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Last Index', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Loop Body', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' }, { name: 'Index', type: 'data' as const, direction: 'out' as const, dataType: 'Integer' }, { name: 'Completed', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' } ] },
      { name: 'Delay', type: 'function' as const, pins: [ { name: '', type: 'exec' as const, direction: 'in' as const, dataType: 'Exec' }, { name: 'Duration', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Completed', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' } ] }
    ]
  },
  {
    category: 'Boolean Logic',
    nodes: [
      { name: 'AND Boolean', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'OR Boolean', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'NOT Boolean', type: 'function' as const, pins: [ { name: 'Input', type: 'data' as const, direction: 'in' as const, dataType: 'Boolean' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
    ]
  },
  {
    category: 'Math (Integer)',
    nodes: [
      { name: 'Integer + Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Integer' } ] },
      { name: 'Integer - Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Integer' } ] },
      { name: 'Integer * Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Integer' } ] },
      { name: 'Integer / Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Integer' } ] },
      { name: 'Integer < Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'Integer > Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'Integer == Integer', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Integer' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
    ]
  },
  {
    category: 'Math (Float)',
    nodes: [
      { name: 'Float + Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Float' } ] },
      { name: 'Float - Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Float' } ] },
      { name: 'Float * Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Float' } ] },
      { name: 'Float / Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Float' } ] },
      { name: 'Float < Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'Float > Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
      { name: 'Float == Float', type: 'function' as const, pins: [ { name: 'A', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'B', type: 'data' as const, direction: 'in' as const, dataType: 'Float' }, { name: 'Return Value', type: 'data' as const, direction: 'out' as const, dataType: 'Boolean' } ] },
    ]
  },
  {
    category: 'Utilities',
    nodes: [
      { name: 'Print String', type: 'function' as const, pins: [ { name: '', type: 'exec' as const, direction: 'in' as const, dataType: 'Exec' }, { name: '', type: 'exec' as const, direction: 'out' as const, dataType: 'Exec' }, { name: 'In String', type: 'data' as const, direction: 'in' as const, dataType: 'String' } ] }
    ]
  }
];

const NodePicker: React.FC<{
    x: number;
    y: number;
    nodeLibrary: typeof nodeLibrary;
    onPick: (nodeTemplate: typeof nodeLibrary[number]['nodes'][number]) => void;
    onClose: () => void;
}> = ({ x, y, nodeLibrary, onPick, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const filteredLibrary = useMemo(() => {
        if (!searchTerm) return nodeLibrary;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return nodeLibrary
            .map(category => ({
                ...category,
                nodes: category.nodes.filter(node => node.name.toLowerCase().includes(lowerSearchTerm))
            }))
            .filter(category => category.nodes.length > 0);
    }, [searchTerm, nodeLibrary]);

    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${y + 10}px`,
        left: `${x + 10}px`,
    };

    return (
        <div
            ref={pickerRef}
            style={style}
            className="z-50 w-72 h-96 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col"
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="p-2 border-b border-slate-700 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Procurar nós..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {filteredLibrary.length > 0 ? filteredLibrary.map(category => (
                    <div key={category.category}>
                        <h4 className="text-xs font-bold text-slate-500 my-2 px-1 uppercase">{category.category}</h4>
                        {category.nodes.map(node => (
                            <button
                                key={node.name}
                                onClick={() => onPick(node)}
                                className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors text-sm text-slate-200"
                            >
                                {node.name}
                            </button>
                        ))}
                    </div>
                )) : <div className="text-center text-slate-500 p-4">Nenhum nó encontrado.</div>}
            </div>
        </div>
    );
};

export const BlueprintCreator: React.FC = () => {
    const [graphData, setGraphData] = useState<GraphData>(initialGraphData);
    const [cppCode, setCppCode] = useState<CppCodeResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'variables' | 'events' | 'functions' | 'nodes'>('variables');
    
    // State for variables
    const [newVariableName, setNewVariableName] = useState<string>('');
    const [newVariableType, setNewVariableType] = useState<string>('Boolean');
    
    // State for events
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
    const [newEventName, setNewEventName] = useState('');

    // State for functions
    const [customFunctions, setCustomFunctions] = useState<CustomFunction[]>([]);
    const [newFunctionName, setNewFunctionName] = useState('');
    const [newFunctionParams, setNewFunctionParams] = useState<FunctionParameter[]>([]);
    const [newFunctionReturnType, setNewFunctionReturnType] = useState('None');
    const [editingFunction, setEditingFunction] = useState<CustomFunction | null>(null);

    const [nodePickerState, setNodePickerState] = useState<{
        visible: boolean;
        screenX: number;
        screenY: number;
        graphX: number;
        graphY: number;
    }>({ visible: false, screenX: 0, screenY: 0, graphX: 0, graphY: 0 });
    const visualizerContainerRef = useRef<HTMLDivElement>(null);

    const handleConvertToCpp = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setCppCode(null);
        try {
            const fullGraphData = { ...graphData, customEvents, customFunctions };
            const response = await generateCppCode(fullGraphData);
            setCppCode(response);
        // Fix: Added missing braces to the catch block to fix a syntax error that was causing numerous other errors.
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setError(`Falha ao gerar o código C++: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [graphData, customEvents, customFunctions]);

    // --- Variable Handlers ---
    const handleAddVariable = () => {
        const trimmedName = newVariableName.trim();
        if (!trimmedName || graphData.variables.some(v => v.name.toLowerCase() === trimmedName.toLowerCase())) return;
        const newVariable: GraphVariable = { name: trimmedName, type: newVariableType };
        setGraphData(prev => ({ ...prev, variables: [...prev.variables, newVariable] }));
        setNewVariableName('');
    };

    const handleDeleteVariable = (variableName: string) => {
        setGraphData(prev => {
            const nodesToRemove = prev.nodes.filter(n => (n.type === 'variable_get' || n.type === 'variable_set') && (n.name === `Get ${variableName}` || n.name === `Set ${variableName}`));
            const pinsToRemove = new Set(nodesToRemove.flatMap(n => n.pins.map(p => p.id)));
            return {
                ...prev,
                variables: prev.variables.filter(v => v.name !== variableName),
                nodes: prev.nodes.filter(n => !nodesToRemove.some(removed => removed.id === n.id)),
                connections: prev.connections.filter(c => !pinsToRemove.has(c.fromPinId) && !pinsToRemove.has(c.toPinId)),
            };
        });
    };

    const handleAddVariableNode = (variable: GraphVariable, type: 'get' | 'set') => {
        const newNode: GraphNode = type === 'get' ? {
            id: generateId('node'), name: `Get ${variable.name}`, type: 'variable_get', x: 250, y: 250,
            pins: [{ id: generateId('pin'), name: 'Value', type: 'data', direction: 'out', dataType: variable.type }],
        } : {
            id: generateId('node'), name: `Set ${variable.name}`, type: 'variable_set', x: 250, y: 250,
            pins: [
                { id: generateId('pin'), name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                { id: generateId('pin'), name: '', type: 'exec', direction: 'out', dataType: 'Exec' },
                { id: generateId('pin'), name: variable.name, type: 'data', direction: 'in', dataType: variable.type },
            ],
        };
        setGraphData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    };

    // --- Event Handlers ---
    const handleAddEvent = () => {
        const trimmedName = newEventName.trim();
        if (!trimmedName || customEvents.some(e => e.name.toLowerCase() === trimmedName.toLowerCase())) return;
        setCustomEvents(prev => [...prev, { id: generateId('eventDef'), name: trimmedName }]);
        setNewEventName('');
    };
    
    const handleDeleteEvent = (eventId: string) => {
        const eventToDelete = customEvents.find(e => e.id === eventId);
        if (!eventToDelete) return;
        setCustomEvents(prev => prev.filter(e => e.id !== eventId));
        // Also remove the corresponding event node from the graph
        setGraphData(prev => {
            const nodesToRemove = prev.nodes.filter(n => n.type === 'event' && n.name === eventToDelete.name);
            const pinsToRemove = new Set(nodesToRemove.flatMap(n => n.pins.map(p => p.id)));
            return {
                ...prev,
                nodes: prev.nodes.filter(n => !nodesToRemove.some(removed => removed.id === n.id)),
                connections: prev.connections.filter(c => !pinsToRemove.has(c.fromPinId) && !pinsToRemove.has(c.toPinId)),
            };
        });
    };

    const handleAddEventNode = (event: CustomEvent) => {
        const newNode: GraphNode = {
            id: generateId('node'), name: event.name, type: 'event', x: 150, y: 150,
            pins: [{ id: generateId('pin'), name: '', type: 'exec', direction: 'out', dataType: 'Exec' }],
        };
        setGraphData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    };
    
    // --- Function Handlers ---
    const resetFunctionForm = () => {
        setEditingFunction(null);
        setNewFunctionName('');
        setNewFunctionParams([]);
        setNewFunctionReturnType('None');
    };

    const handleCreateFunction = () => {
        const trimmedName = newFunctionName.trim();
        if (!trimmedName || customFunctions.some(f => f.name.toLowerCase() === trimmedName.toLowerCase())) return;
        setCustomFunctions(prev => [...prev, { id: generateId('funcDef'), name: trimmedName, parameters: newFunctionParams, returnType: newFunctionReturnType }]);
        resetFunctionForm();
    };

    const handleUpdateFunction = () => {
        if (!editingFunction) return;
        const trimmedName = newFunctionName.trim();
        if (!trimmedName) return;
        if (customFunctions.some(f => f.id !== editingFunction.id && f.name.toLowerCase() === trimmedName.toLowerCase())) {
            // In a real app, show an error to the user
            console.error("Function name already exists");
            return;
        }

        const updatedFunction: CustomFunction = {
            ...editingFunction,
            name: trimmedName,
            parameters: newFunctionParams,
            returnType: newFunctionReturnType,
        };

        setCustomFunctions(prev => prev.map(f => f.id === editingFunction.id ? updatedFunction : f));

        setGraphData(prev => {
            const affectedNodes = prev.nodes.filter(n => n.type === 'function' && n.name === editingFunction.name);
            if (affectedNodes.length === 0) return prev;

            const pinsToRemove = new Set(affectedNodes.flatMap(n => n.pins.map(p => p.id)));
            const newConnections = prev.connections.filter(c => !pinsToRemove.has(c.fromPinId) && !pinsToRemove.has(c.toPinId));
            
            const newNodes = prev.nodes.map(node => {
                if (node.type === 'function' && node.name === editingFunction.name) {
                    const pins: GraphPin[] = [
                        { id: generateId('pin'), name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                        { id: generateId('pin'), name: '', type: 'exec', direction: 'out', dataType: 'Exec' },
                        ...updatedFunction.parameters.map(p => ({ id: generateId('pin'), name: p.name, type: 'data' as 'data', direction: 'in' as 'in', dataType: p.type })),
                    ];
                    if (updatedFunction.returnType !== 'None') {
                        pins.push({ id: generateId('pin'), name: 'Return Value', type: 'data' as 'data', direction: 'out' as 'out', dataType: updatedFunction.returnType });
                    }
                    return { ...node, name: updatedFunction.name, pins };
                }
                return node;
            });

            return { ...prev, nodes: newNodes, connections: newConnections };
        });

        resetFunctionForm();
    };

    const handleEditFunctionStart = (func: CustomFunction) => {
        setActiveTab('functions');
        setEditingFunction(func);
        setNewFunctionName(func.name);
        setNewFunctionParams(func.parameters.map(p => ({...p}))); // Create copies
        setNewFunctionReturnType(func.returnType);
    };

    const handleDeleteFunction = (functionId: string) => {
        const funcToDelete = customFunctions.find(f => f.id === functionId);
        if(!funcToDelete) return;
        setCustomFunctions(prev => prev.filter(f => f.id !== functionId));
        setGraphData(prev => {
            const nodesToRemove = prev.nodes.filter(n => n.type === 'function' && n.name === funcToDelete.name);
            const pinsToRemove = new Set(nodesToRemove.flatMap(n => n.pins.map(p => p.id)));
             return {
                ...prev,
                nodes: prev.nodes.filter(n => !nodesToRemove.some(removed => removed.id === n.id)),
                connections: prev.connections.filter(c => !pinsToRemove.has(c.fromPinId) && !pinsToRemove.has(c.toPinId)),
            };
        });
    };

    const handleAddFunctionCallNode = (func: CustomFunction) => {
        const pins: GraphPin[] = [
            { id: generateId('pin'), name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
            { id: generateId('pin'), name: '', type: 'exec', direction: 'out', dataType: 'Exec' },
            ...func.parameters.map(p => ({ id: generateId('pin'), name: p.name, type: 'data' as 'data', direction: 'in' as 'in', dataType: p.type })),
        ];
        if (func.returnType !== 'None') {
            pins.push({ id: generateId('pin'), name: 'Return Value', type: 'data' as 'data', direction: 'out' as 'out', dataType: func.returnType });
        }
        const newNode: GraphNode = { id: generateId('node'), name: func.name, type: 'function', x: 300, y: 300, pins };
        setGraphData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
    };

    const handleParamChange = (index: number, field: 'name' | 'type', value: string) => {
        setNewFunctionParams(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const addParam = () => setNewFunctionParams(prev => [...prev, { id: generateId('param'), name: `Param${prev.length}`, type: 'Boolean' }]);
    const removeParam = (id: string) => setNewFunctionParams(prev => prev.filter(p => p.id !== id));

    // --- Common Node Handlers ---
    const handleAddCommonNode = (nodeTemplate: typeof nodeLibrary[number]['nodes'][number], position?: { x: number; y: number }) => {
        const newNode: GraphNode = {
            id: generateId('node'),
            name: nodeTemplate.name,
            type: nodeTemplate.type,
            x: position?.x ?? 300,
            y: position?.y ?? 300,
            pins: nodeTemplate.pins.map(pin => ({
                ...pin,
                id: generateId('pin'),
            })),
        };
        setGraphData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
    };

    const handleCanvasClick = useCallback((event: { screenX: number; screenY: number; graphX: number; graphY: number }) => {
        if (!visualizerContainerRef.current) return;
        const rect = visualizerContainerRef.current.getBoundingClientRect();
        setNodePickerState({
            visible: true,
            screenX: event.screenX - rect.left,
            screenY: event.screenY - rect.top,
            graphX: event.graphX,
            graphY: event.graphY,
        });
    }, []);

    const handleNodePick = (nodeTemplate: typeof nodeLibrary[number]['nodes'][number]) => {
        handleAddCommonNode(nodeTemplate, { x: nodePickerState.graphX, y: nodePickerState.graphY });
        setNodePickerState({ ...nodePickerState, visible: false });
    };

    const renderSidebarContent = () => {
        if (activeTab === 'variables') return (
            <>
                <div className="mb-4 p-3 bg-slate-800/70 rounded-md border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-400 mb-2">Adicionar Nova Variável</h4>
                    <input type="text" placeholder="Nome da Variável" value={newVariableName} onChange={(e) => setNewVariableName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <select value={newVariableType} onChange={(e) => setNewVariableType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {variableTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button onClick={handleAddVariable} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"><PlusIcon className="w-4 h-4" />Adicionar</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {graphData.variables.map(variable => (
                        <div key={variable.name} className="p-2 bg-slate-800 rounded-md border border-slate-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-200 text-sm">{variable.name}</p>
                                    <p className="text-xs text-blue-400">{variable.type}</p>
                                </div>
                                <button onClick={() => handleDeleteVariable(variable.name)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <button onClick={() => handleAddVariableNode(variable, 'get')} className="flex-1 text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Get</button>
                                <button onClick={() => handleAddVariableNode(variable, 'set')} className="flex-1 text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Set</button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
        if (activeTab === 'events') return (
             <>
                <div className="mb-4 p-3 bg-slate-800/70 rounded-md border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-400 mb-2">Adicionar Novo Evento</h4>
                    <input type="text" placeholder="Nome do Evento" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <button onClick={handleAddEvent} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"><PlusIcon className="w-4 h-4" />Adicionar</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {customEvents.map(event => (
                        <div key={event.id} className="p-2 bg-slate-800 rounded-md border border-slate-700">
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-slate-200 text-sm">{event.name}</p>
                                <button onClick={() => handleDeleteEvent(event.id)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                             <button onClick={() => handleAddEventNode(event)} className="mt-2 w-full text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Adicionar Nó de Evento</button>
                        </div>
                    ))}
                </div>
            </>
        );
        if (activeTab === 'functions') return (
             <>
                <div className="mb-4 p-3 bg-slate-800/70 rounded-md border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-400 mb-2">{editingFunction ? 'Editar Função' : 'Criar Nova Função'}</h4>
                    <input type="text" placeholder="Nome da Função" value={newFunctionName} onChange={(e) => setNewFunctionName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <h5 className="text-xs font-bold text-slate-500 my-2">Parâmetros</h5>
                    {newFunctionParams.map((param, index) => (
                        <div key={param.id} className="flex gap-1 mb-1 items-center">
                            <input type="text" placeholder="Nome" value={param.name} onChange={e => handleParamChange(index, 'name', e.target.value)} className="flex-1 w-0 bg-slate-700 border border-slate-600 rounded p-1 text-xs"/>
                            <select value={param.type} onChange={e => handleParamChange(index, 'type', e.target.value)} className="flex-1 w-0 bg-slate-700 border border-slate-600 rounded p-1 text-xs">
                                {variableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={() => removeParam(param.id)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="w-3 h-3"/></button>
                        </div>
                    ))}
                    <button onClick={addParam} className="w-full text-xs py-1 my-1 bg-slate-700 hover:bg-slate-600 rounded">Adicionar Parâmetro</button>
                    <h5 className="text-xs font-bold text-slate-500 my-2">Retorno</h5>
                    <select value={newFunctionReturnType} onChange={(e) => setNewFunctionReturnType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="None">None</option>
                        {variableTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <div className="flex gap-2">
                        {editingFunction && (
                            <button onClick={resetFunctionForm} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-600 hover:bg-slate-700 rounded-md">Cancelar</button>
                        )}
                        <button onClick={editingFunction ? handleUpdateFunction : handleCreateFunction} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md">
                            {editingFunction ? 'Salvar Alterações' : <><PlusIcon className="w-4 h-4" />Criar</>}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                     {customFunctions.map(func => (
                        <div key={func.id} className="p-2 bg-slate-800 rounded-md border border-slate-700">
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-slate-200 text-sm">{func.name}</p>
                                <div className="flex items-center">
                                    <button onClick={() => handleEditFunctionStart(func)} className="p-1 text-slate-400 hover:text-blue-400"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteFunction(func.id)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <button onClick={() => handleAddFunctionCallNode(func)} className="mt-2 w-full text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Adicionar Nó de Chamada</button>
                        </div>
                    ))}
                </div>
            </>
        );
        if (activeTab === 'nodes') return (
            <>
                <div className="flex-1 overflow-y-auto space-y-4 p-2 pr-1">
                    {nodeLibrary.map(category => (
                        <div key={category.category}>
                            <h4 className="text-sm font-bold text-slate-400 mb-2 p-1 border-b border-slate-700">{category.category}</h4>
                            <div className="space-y-2">
                                {category.nodes.map(node => (
                                    <button 
                                        key={node.name}
                                        onClick={() => handleAddCommonNode(node)}
                                        className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
                                    >
                                        <p className="font-bold text-slate-200 text-sm">{node.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const TabButton: React.FC<{ tabId: 'variables' | 'events' | 'functions' | 'nodes'; icon: React.ReactNode; label: string }> = ({ tabId, icon, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            title={label}
            className={`flex-1 flex flex-col items-center justify-center p-2 text-xs border-b-2 transition-colors duration-200 ${
                activeTab === tabId ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:bg-slate-700/50'
            }`}
        >
            {icon}
            <span className="mt-1">{label}</span>
        </button>
    );

    return (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg min-h-[600px]">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-200">Editor de Blueprints</h2>
                </div>
                
                <div className="flex-grow flex overflow-hidden">
                    <div className="w-80 bg-slate-900/40 border-r border-slate-700 flex flex-col">
                        <div className="flex-shrink-0 flex border-b border-slate-700">
                            <TabButton tabId="variables" icon={<VariableIcon className="w-5 h-5"/>} label="Variáveis" />
                            <TabButton tabId="events" icon={<BoltIcon className="w-5 h-5"/>} label="Eventos" />
                            <TabButton tabId="functions" icon={<FunctionIcon className="w-5 h-5"/>} label="Funções" />
                            <TabButton tabId="nodes" icon={<BlocksIcon className="w-5 h-5"/>} label="Nós" />
                        </div>
                        <div className="p-2 flex flex-col flex-grow overflow-hidden">
                            {renderSidebarContent()}
                        </div>
                    </div>
                    
                    <div ref={visualizerContainerRef} className="flex-1 h-full relative">
                         <BlueprintVisualizer
                            graphData={graphData}
                            isInteractive={true}
                            onGraphChange={setGraphData}
                            onCanvasClick={handleCanvasClick}
                         />
                         {nodePickerState.visible && (
                            <NodePicker
                                x={nodePickerState.screenX}
                                y={nodePickerState.screenY}
                                nodeLibrary={nodeLibrary}
                                onPick={handleNodePick}
                                onClose={() => setNodePickerState({ ...nodePickerState, visible: false })}
                            />
                        )}
                    </div>
                </div>

                 <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={handleConvertToCpp}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Convertendo...
                            </>
                        ) : (
                            <>
                                <MagicWandIcon className="w-5 h-5 mr-2" />
                                Converter para C++
                            </>
                        )}
                    </button>
                </div>
            </div>
            <CppCodeDisplay code={cppCode} isLoading={isLoading} error={error} />
        </main>
    );
};
