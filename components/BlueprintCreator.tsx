import React, { useState, useCallback } from 'react';
import { generateCppCode, GraphData, GraphNode, GraphPin, CppCodeResponse } from '../services/geminiService';
import { BlueprintVisualizer } from './BlueprintVisualizer'; // We'll reuse the visualizer for now
import { CppCodeDisplay } from './CppCodeDisplay';
import { MagicWandIcon, PlusIcon } from './icons';

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

export const BlueprintCreator: React.FC = () => {
    const [graphData, setGraphData] = useState<GraphData>(initialGraphData);
    const [cppCode, setCppCode] = useState<CppCodeResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    // NOTE: For this iteration, we are not building a full interactive editor,
    // as it's a very complex task. Instead, we'll display the initial
    // graph and allow converting it. A full editor would be the next feature step.

    return (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-200">Editor de Blueprints (Visualização)</h2>
                        <p className="text-sm text-slate-400">Visualize o grafo de exemplo abaixo.</p>
                    </div>
                     {/* In a future version, this would add new nodes */}
                    <button className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50" disabled>
                        <PlusIcon className="w-4 h-4" />
                        Adicionar Nó
                    </button>
                </div>
                <div className="flex-grow p-4 h-[500px] lg:h-auto">
                     <BlueprintVisualizer graphData={graphData} isInteractive={true} />
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
