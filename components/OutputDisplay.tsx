import React, { useState, useEffect } from 'react';
import { GuideDisplay } from './GuideDisplay';
import { BlueprintVisualizer } from './BlueprintVisualizer';
import { BlueprintOverview } from './BlueprintOverview';
import type { BlueprintGraph } from '../services/geminiService';
import { BookOpenIcon, ShareNodesIcon, FocusIcon, GridIcon } from './icons';

interface OutputDisplayProps {
  guide: string;
  blueprintGraphs: BlueprintGraph[];
  isLoading: boolean;
  error: string | null;
}

type ActiveTab = 'guide' | 'visualizer';
type ViewMode = 'focus' | 'overview';

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-6">
    <div className="h-8 bg-slate-700 rounded w-1/2"></div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
    </div>
    <div className="h-6 bg-slate-700 rounded w-1/3 mt-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-4/6"></div>
    </div>
  </div>
);

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ guide, blueprintGraphs, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('guide');
  const [selectedGraphIndex, setSelectedGraphIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('focus');

  useEffect(() => {
    setSelectedGraphIndex(0);
  }, [blueprintGraphs]);

  const hasContent = guide && blueprintGraphs.length > 0;
  const selectedGraph = hasContent ? blueprintGraphs[selectedGraphIndex] : null;

  const renderVisualizerContent = () => {
    if (viewMode === 'overview') {
        return <BlueprintOverview blueprintGraphs={blueprintGraphs} />;
    }
    
    // Focus Mode
    return (
        <div className="p-4 flex flex-col h-full">
            {blueprintGraphs.length > 1 && (
              <div className="mb-4 flex-shrink-0">
                <label htmlFor="graph-selector" className="block text-sm font-medium text-slate-400 mb-1">
                  Selecione o Gráfico
                </label>
                <select
                  id="graph-selector"
                  value={selectedGraphIndex}
                  onChange={(e) => setSelectedGraphIndex(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {blueprintGraphs.map((graph, index) => (
                    <option key={graph.name + index} value={index}>{graph.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedGraph && (
                <>
                    <p className="text-sm text-slate-300 mb-4 p-3 bg-slate-900/50 rounded-md border border-slate-700 flex-shrink-0">
                        {selectedGraph.description}
                    </p>
                    <div className="flex-grow h-0 min-h-[400px]">
                        <BlueprintVisualizer graphData={selectedGraph.graphData} isInteractive={true} />
                    </div>
                </>
            )}
        </div>
    );
  };


  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) {
      return (
        <div className="p-6">
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md" role="alert">
                <strong className="font-bold">Erro! </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        </div>
      );
    }
    if (!hasContent) {
      return (
        <div className="text-center text-slate-500 h-full flex items-center justify-center p-6">
          <p>Seu guia e visualização de Blueprints aparecerão aqui...</p>
        </div>
      );
    }
    return (
      <>
        {activeTab === 'guide' ? (
          <div className="p-6">
            <GuideDisplay guide={guide} />
          </div>
        ) : (
          renderVisualizerContent()
        )}
      </>
    );
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg flex flex-col h-full">
      <div className="p-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setActiveTab('guide')}
                disabled={!hasContent}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeTab === 'guide' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'} disabled:opacity-50 disabled:hover:bg-transparent`}
            >
                <BookOpenIcon className="w-4 h-4 mr-2" />
                Guia
            </button>
            <button 
                onClick={() => setActiveTab('visualizer')}
                disabled={!hasContent}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeTab === 'visualizer' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'} disabled:opacity-50 disabled:hover:bg-transparent`}
            >
                <ShareNodesIcon className="w-4 h-4 mr-2" />
                Visualizador
            </button>
        </div>
        
        <div className="flex items-center gap-4">
            {activeTab === 'visualizer' && hasContent && (
                <div className="flex items-center bg-slate-700 rounded-md p-1">
                    <button 
                        onClick={() => setViewMode('focus')}
                        title="Modo Foco"
                        className={`p-1 rounded ${viewMode === 'focus' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-600'}`}
                    >
                        <FocusIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('overview')}
                        title="Modo Visão Geral"
                        className={`p-1 rounded ${viewMode === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-600'}`}
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
             <h2 className="text-xl font-bold text-slate-200 pr-2">Resultado</h2>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto h-[570px] lg:h-[calc(100%-70px)]">
        {renderContent()}
      </div>
    </div>
  );
};