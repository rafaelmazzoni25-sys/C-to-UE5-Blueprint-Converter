
import React, { useState } from 'react';
import { GuideDisplay } from './GuideDisplay';
import { BlueprintVisualizer } from './BlueprintVisualizer';
import type { GraphData } from '../services/geminiService';
import { BookOpenIcon, ShareNodesIcon } from './icons';

interface OutputDisplayProps {
  guide: string;
  graphData: GraphData | null;
  isLoading: boolean;
  error: string | null;
}

type ActiveTab = 'guide' | 'visualizer';

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

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ guide, graphData, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('guide');

  const hasContent = guide && graphData;

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
      <div className="p-6">
        {activeTab === 'guide' ? (
          <GuideDisplay guide={guide} />
        ) : (
          graphData && <BlueprintVisualizer graphData={graphData} />
        )}
      </div>
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
        <div className="pr-4">
             <h2 className="text-xl font-bold text-slate-200">Resultado</h2>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto h-[570px] lg:h-[calc(100%-70px)]">
        {renderContent()}
      </div>
    </div>
  );
};
