import React, { useState, useEffect } from 'react';
import type { CppCodeResponse } from '../services/geminiService';
import { CopyIcon, CodeIcon } from './icons';

interface CppCodeDisplayProps {
  code: CppCodeResponse | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-4">
    <div className="flex space-x-2">
        <div className="h-8 bg-slate-700 rounded w-24"></div>
        <div className="h-8 bg-slate-700/50 rounded w-24"></div>
    </div>
    <div className="h-64 bg-slate-700 rounded"></div>
  </div>
);

const CodeBlock: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
    };

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    return (
        <div className="relative bg-slate-900 rounded-md">
            <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-slate-700/80 text-slate-300 rounded-md hover:bg-slate-600 transition-colors"
                title="Copiar código"
            >
                <CopyIcon className="w-4 h-4" />
            </button>
            {copied && <span className="absolute top-2 right-10 text-xs bg-green-500 text-white px-2 py-1 rounded-md">Copiado!</span>}
            <pre className="p-4 overflow-x-auto text-sm font-mono">
                <code>{content}</code>
            </pre>
        </div>
    );
};


export const CppCodeDisplay: React.FC<CppCodeDisplayProps> = ({ code, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState<'header' | 'source'>('header');
  
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
    if (!code) {
      return (
        <div className="text-center text-slate-500 h-full flex items-center justify-center p-6">
          <p>Seu código C++ gerado aparecerá aqui...</p>
        </div>
      );
    }
    return (
        <div className="p-4">
            <div className="mb-4 flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('header')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'header' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:border-slate-500'}`}
                >
                    Cabeçalho (.h)
                </button>
                 <button
                    onClick={() => setActiveTab('source')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'source' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:border-slate-500'}`}
                >
                    Fonte (.cpp)
                </button>
            </div>
            <div>
                {activeTab === 'header' && <CodeBlock content={code.header} />}
                {activeTab === 'source' && <CodeBlock content={code.source} />}
            </div>
        </div>
    );
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg flex flex-col h-full">
        <div className="p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                <CodeIcon className="w-6 h-6" />
                Código C++ Gerado
            </h2>
        </div>
        <div className="flex-grow overflow-y-auto">
            {renderContent()}
        </div>
    </div>
  );
};
