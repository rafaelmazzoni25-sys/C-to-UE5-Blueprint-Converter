import React from 'react';
import type { BlueprintGraph } from '../services/geminiService';
import { BlueprintVisualizer } from './BlueprintVisualizer';

interface BlueprintOverviewProps {
    blueprintGraphs: BlueprintGraph[];
}

export const BlueprintOverview: React.FC<BlueprintOverviewProps> = ({ blueprintGraphs }) => {
    return (
        <div className="p-4 space-y-8 h-full overflow-y-auto">
            {blueprintGraphs.map((graph, index) => (
                <div key={graph.name + index} className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-700">
                        <h3 className="text-xl font-bold text-teal-300">{graph.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{graph.description}</p>
                    </div>
                    <div className="h-96 bg-slate-800/50 p-2">
                        <BlueprintVisualizer graphData={graph.graphData} isInteractive={false} />
                    </div>
                </div>
            ))}
        </div>
    );
};
