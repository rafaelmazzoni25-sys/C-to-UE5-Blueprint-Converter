
import React from 'react';
import { MagicWandIcon } from './icons';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, onGenerate, isLoading }) => {
  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-lg border border-slate-700 shadow-lg">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-slate-200">Código C++</h2>
        <p className="text-sm text-slate-400">Cole seu código-fonte aqui.</p>
      </div>
      <div className="flex-grow p-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`// Exemplo:
#include <iostream>

int main() {
    int vida = 100;
    if (vida > 0) {
        std::cout << "O jogador está vivo!" << std::endl;
    }
    return 0;
}`}
          className="w-full h-full min-h-[400px] lg:min-h-[500px] p-4 bg-slate-900 border border-slate-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-300 font-mono text-sm"
          disabled={isLoading}
        />
      </div>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando Guia...
            </>
          ) : (
            <>
              <MagicWandIcon className="w-5 h-5 mr-2" />
              Gerar Guia de Blueprints
            </>
          )}
        </button>
      </div>
    </div>
  );
};
