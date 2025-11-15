
import React, { useState, useCallback } from 'react';
// FIX: Import `GraphData` to use for state typing.
import { generateBlueprintGuide, BlueprintResponse, GraphData } from './services/geminiService';
import { CodeEditor } from './components/CodeEditor';
import { OutputDisplay } from './components/OutputDisplay';
import { UnrealIcon } from './components/icons';

const App: React.FC = () => {
  const [cppCode, setCppCode] = useState<string>('');
  const [blueprintGuide, setBlueprintGuide] = useState<string>('');
  // FIX: Changed state type from `any` to `GraphData | null` for type safety.
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!cppCode.trim()) {
      setError('O campo de código C++ não pode estar vazio.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setBlueprintGuide('');
    setGraphData(null);

    try {
      const response: BlueprintResponse = await generateBlueprintGuide(cppCode);
      setBlueprintGuide(response.guide);
      setGraphData(response.graphData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao gerar o guia: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [cppCode]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-screen-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-2">
            <UnrealIcon className="h-12 w-12 text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
              C++ para Blueprints UE5
            </h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Cole seu código C++ para receber um guia e uma visualização de como recriar a lógica na Unreal Engine usando Blueprints.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CodeEditor
            code={cppCode}
            setCode={setCppCode}
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />
          <OutputDisplay
            guide={blueprintGuide}
            graphData={graphData}
            isLoading={isLoading}
            error={error}
          />
        </main>
        
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by Google Gemini. Ferramenta para fins educacionais.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
