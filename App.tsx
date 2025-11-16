import React, { useState, useCallback } from 'react';
import { generateBlueprintGuide, BlueprintResponse, BlueprintGraph } from './services/geminiService';
import { CodeEditor } from './components/CodeEditor';
import { OutputDisplay } from './components/OutputDisplay';
import { BlueprintCreator } from './components/BlueprintCreator';
import { UnrealIcon, CpuChipIcon, CodeIcon } from './components/icons';

type Mode = 'cpp-to-bp' | 'bp-to-cpp';

const App: React.FC = () => {
  const [cppCode, setCppCode] = useState<string>('');
  const [blueprintGuide, setBlueprintGuide] = useState<string>('');
  const [blueprintGraphs, setBlueprintGraphs] = useState<BlueprintGraph[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('cpp-to-bp');

  const handleGenerate = useCallback(async () => {
    if (!cppCode.trim()) {
      setError('O campo de código C++ não pode estar vazio.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setBlueprintGuide('');
    setBlueprintGraphs([]);

    try {
      const response: BlueprintResponse = await generateBlueprintGuide(cppCode);
      setBlueprintGuide(response.guide);
      setBlueprintGraphs(response.blueprintGraphs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao gerar o guia: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [cppCode]);

  const ModeButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-screen-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-2">
            <UnrealIcon className="h-12 w-12 text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
              Conversor C++ &lt;&gt; Blueprints UE5
            </h1>
          </div>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            Use IA para converter código C++ em guias de Blueprint ou crie Blueprints visualmente para gerar o código C++ correspondente.
          </p>
        </header>

        <div className="flex justify-center my-8">
          <div className="flex items-center gap-4 p-2 bg-slate-800 rounded-lg shadow-md">
            <ModeButton active={mode === 'cpp-to-bp'} onClick={() => setMode('cpp-to-bp')}>
              <CodeIcon className="w-5 h-5" />
              C++ para Blueprints
            </ModeButton>
            <ModeButton active={mode === 'bp-to-cpp'} onClick={() => setMode('bp-to-cpp')}>
              <CpuChipIcon className="w-5 h-5" />
              Blueprints para C++
            </ModeButton>
          </div>
        </div>

        {mode === 'cpp-to-bp' ? (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CodeEditor
              code={cppCode}
              setCode={setCppCode}
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />
            <OutputDisplay
              guide={blueprintGuide}
              blueprintGraphs={blueprintGraphs}
              isLoading={isLoading}
              error={error}
            />
          </main>
        ) : (
          <BlueprintCreator />
        )}
        
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by Google Gemini. Ferramenta para fins educacionais.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
