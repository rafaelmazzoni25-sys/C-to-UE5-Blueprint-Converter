import React, { useState, useCallback } from 'react';
import { generateCppCode, GraphData, GraphNode, CppCodeResponse, GraphVariable } from '../services/geminiService';
import { BlueprintVisualizer } from './BlueprintVisualizer';
import { CppCodeDisplay } from './CppCodeDisplay';
import { MagicWandIcon, PlusIcon, TrashIcon, VariableIcon } from './icons';

const initialGraphData: GraphData = {
    nodes: [
        {
            id: 'node-1',
            name: 'Event BeginPlay',
            type: 'event',
            x: 100,
            y: 200,
            pins: [{ id: 'pin-1', name: '', type: 'exec', direction: 'out', dataType: 'Exec' }],
        },
        {
            id: 'node-2',
            name: 'Print String',
            type: 'function',
            x: 450,
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
            x: 100,
            y: 350,
            properties: { value: "Hello World from Blueprint!" },
            pins: [{ id: 'pin-5', name: 'Value', type: 'data', direction: 'out', dataType: 'String' }],
        },
    ],
    connections: [
        { fromPinId: 'pin-1', toPinId: 'pin-2' },
        { fromPinId: 'pin-5', toPinId: 'pin-4' }
    ],
    variables: [
        { name: "PlayerHealth", type: "Integer" },
        { name: "IsAlive", type: "Boolean" }
    ],
};

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const BlueprintCreator: React.FC = () => {
    const [graphData, setGraphData] = useState<GraphData>(initialGraphData);
    const [cppCode, setCppCode] = useState<CppCodeResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [newVariableName, setNewVariableName] = useState<string>('');
    const [newVariableType, setNewVariableType] = useState<string>('Boolean');
    const variableTypes = ['Boolean', 'Integer', 'Float', 'String', 'Vector', 'Rotator', 'Transform', 'Name'];


    const handleConvertToCpp = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setCppCode(null);
        try {
            const response = await generateCppCode(graphData);
            setCppCode(response);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setError(`Falha ao gerar o código C++: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [graphData]);

    const handleAddVariable = () => {
        const trimmedName = newVariableName.trim();
        if (!trimmedName || graphData.variables.some(v => v.name.toLowerCase() === trimmedName.toLowerCase())) {
            // Basic validation: prevent empty or duplicate names
            return;
        }
        const newVariable: GraphVariable = { name: trimmedName, type: newVariableType };
        setGraphData(prev => ({
            ...prev,
            variables: [...prev.variables, newVariable]
        }));
        setNewVariableName('');
    };

    const handleDeleteVariable = (variableName: string) => {
        setGraphData(prev => {
            const newVariables = prev.variables.filter(v => v.name !== variableName);
            
            const nodesToRemove = new Set<string>();
            const pinsToRemove = new Set<string>();

            prev.nodes.forEach(node => {
                if ((node.type === 'variable_get' && node.name === `Get ${variableName}`) ||
                    (node.type === 'variable_set' && node.name === `Set ${variableName}`)) {
                    nodesToRemove.add(node.id);
                    node.pins.forEach(pin => pinsToRemove.add(pin.id));
                }
            });

            if (nodesToRemove.size === 0) {
                return { ...prev, variables: newVariables };
            }

            const newNodes = prev.nodes.filter(node => !nodesToRemove.has(node.id));
            const newConnections = prev.connections.filter(conn => 
                !pinsToRemove.has(conn.fromPinId) && !pinsToRemove.has(conn.toPinId)
            );

            return {
                variables: newVariables,
                nodes: newNodes,
                connections: newConnections,
            };
        });
    };

    const handleAddVariableNode = (variable: GraphVariable, type: 'get' | 'set') => {
        const nodeId = generateId('node');
        let newNode: GraphNode;

        if (type === 'get') {
            newNode = {
                id: nodeId,
                name: `Get ${variable.name}`,
                type: 'variable_get',
                x: 250,
                y: 250,
                pins: [{ id: generateId('pin'), name: 'Value', type: 'data', direction: 'out', dataType: variable.type }],
            };
        } else { // set
            newNode = {
                id: nodeId,
                name: `Set ${variable.name}`,
                type: 'variable_set',
                x: 250,
                y: 250,
                pins: [
                    { id: generateId('pin'), name: '', type: 'exec', direction: 'in', dataType: 'Exec' },
                    { id: generateId('pin'), name: '', type: 'exec', direction: 'out', dataType: 'Exec' },
                    { id: generateId('pin'), name: variable.name, type: 'data', direction: 'in', dataType: variable.type },
                ],
            };
        }

        setGraphData(prev => ({
            ...prev,
            nodes: [...prev.nodes, newNode],
        }));
    };


    return (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg min-h-[600px]">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-200">Editor de Blueprints</h2>
                </div>
                
                <div className="flex-grow flex overflow-hidden">
                    {/* Variables Panel */}
                    <div className="w-72 bg-slate-900/40 p-4 border-r border-slate-700 flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <VariableIcon className="w-5 h-5" />
                            Variáveis
                        </h3>
                        {/* Add Variable Form */}
                        <div className="mb-4 p-3 bg-slate-800/70 rounded-md border border-slate-700">
                            <h4 className="text-sm font-bold text-slate-400 mb-2">Adicionar Nova Variável</h4>
                            <input
                                type="text"
                                placeholder="Nome da Variável"
                                value={newVariableName}
                                onChange={(e) => setNewVariableName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={newVariableType}
                                onChange={(e) => setNewVariableType(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {variableTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <button
                                onClick={handleAddVariable}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Adicionar
                            </button>
                        </div>
                        {/* Variables List */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {graphData.variables.map(variable => (
                                <div key={variable.name} className="p-2 bg-slate-800 rounded-md border border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-200 text-sm">{variable.name}</p>
                                            <p className="text-xs text-blue-400">{variable.type}</p>
                                        </div>
                                        <button onClick={() => handleDeleteVariable(variable.name)} className="p-1 text-slate-400 hover:text-red-400">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => handleAddVariableNode(variable, 'get')} className="flex-1 text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Get</button>
                                        <button onClick={() => handleAddVariableNode(variable, 'set')} className="flex-1 text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded">Set</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Visualizer */}
                    <div className="flex-1 h-full">
                         <BlueprintVisualizer graphData={graphData} isInteractive={true} />
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