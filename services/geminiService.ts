import { GoogleGenAI, Type } from "@google/genai";

// --- Data Structures for Blueprint Visualization ---

export interface GraphPin {
  id: string;
  name: string;
  type: 'exec' | 'data';
  direction: 'in' | 'out';
  dataType: string; // e.g., 'Integer', 'Boolean', 'Exec', 'String', 'Object'
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'event' | 'function' | 'flow_control' | 'variable_get' | 'variable_set' | 'literal';
  x: number;
  y: number;
  properties?: { value?: string };
  codeSnippet?: string;
  pins: GraphPin[];
}

export interface GraphConnection {
  fromPinId: string;
  toPinId: string;
}

export interface GraphVariable {
    name: string;
    type: string;
}

export interface CustomEvent {
    id: string;
    name: string;
}

export interface FunctionParameter {
    id: string;
    name: string;
    type: string;
}

export interface CustomFunction {
    id: string;
    name: string;
    parameters: FunctionParameter[];
    returnType: string; // 'None' para nenhum retorno
}

export interface GraphData {
    nodes: GraphNode[];
    connections: GraphConnection[];
    variables: GraphVariable[];
    customEvents?: CustomEvent[];
    customFunctions?: CustomFunction[];
}


// New interface for a single Blueprint graph with its context
export interface BlueprintGraph {
    name: string;
    description: string;
    graphData: GraphData;
}

// Updated main response structure for C++ to BP
export interface BlueprintResponse {
    guide: string;
    blueprintGraphs: BlueprintGraph[];
}

// New response structure for BP to C++
export interface CppCodeResponse {
    header: string;
    source: string;
}


// --- Gemini API Service ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const graphDataSchema = {
    type: Type.OBJECT,
    description: "Dados estruturados para a visualização do Blueprint.",
    properties: {
    nodes: {
        type: Type.ARRAY,
        items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            properties: {
            type: Type.OBJECT,
            properties: { value: { type: Type.STRING } },
            },
            codeSnippet: { type: Type.STRING },
            pins: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, description: "'exec' ou 'data'" },
                direction: { type: Type.STRING, description: "'in' ou 'out'" },
                dataType: { type: Type.STRING, description: "Tipo de dado do pino, e.g., 'Integer', 'Boolean', 'Exec'" }
                },
                required: ['id', 'name', 'type', 'direction', 'dataType']
            }
            }
        },
        required: ['id', 'name', 'type', 'x', 'y', 'pins']
        }
    },
    connections: {
        type: Type.ARRAY,
        items: {
        type: Type.OBJECT,
        properties: {
            fromPinId: { type: Type.STRING },
            toPinId: { type: Type.STRING }
        },
        required: ['fromPinId', 'toPinId']
        }
    },
    variables: {
        type: Type.ARRAY,
        items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING }
        },
        required: ['name', 'type']
        }
    }
    },
    required: ['nodes', 'connections', 'variables']
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    guide: {
      type: Type.STRING,
      description: "Um guia geral e introdutório em formato markdown."
    },
    blueprintGraphs: {
        type: Type.ARRAY,
        description: "Um array contendo um grafo de blueprint para cada função ou evento principal no código C++.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "O nome da função ou evento (e.g., 'Event BeginPlay', 'MyCustomFunction')."},
                description: { type: Type.STRING, description: "Uma breve explicação da finalidade deste grafo de blueprint."},
                graphData: graphDataSchema
            },
            required: ['name', 'description', 'graphData']
        }
    }
  },
  required: ['guide', 'blueprintGraphs']
};


export const generateBlueprintGuide = async (cppCode: string): Promise<BlueprintResponse> => {
  if (!cppCode.trim()) {
    throw new Error("O código C++ não pode estar vazio.");
  }

  const model = "gemini-2.5-pro";

  const prompt = `
    Você é um desenvolvedor especialista em Unreal Engine 5. Sua tarefa é analisar o código C++ e dividí-lo em múltiplos grafos de Blueprint, um para cada função ou evento principal.
    Sua resposta DEVE ser um único objeto JSON VÁLIDO que corresponda ao schema.

    **Regras Gerais:**
    - **Identifique Funções**: Analise o código C++ e identifique cada função, evento (como BeginPlay, Tick) ou bloco lógico distinto.
    - **Crie Múltiplos Grafos**: Para cada função/evento identificado, gere um objeto de grafo separado.
    - **Guia Geral**: O campo 'guide' deve ser um texto markdown geral sobre o código como um todo.
    - **blueprintGraphs Array**: Coloque todos os objetos de grafo de função/evento dentro deste array.
        - **name**: O nome da função/evento que o grafo representa.
        - **description**: Uma descrição concisa da finalidade deste grafo específico.
        - **graphData**: Os dados do grafo (nós, conexões, etc.) para esta função.
    - **codeSnippet**: Para cada nó, o campo opcional 'codeSnippet' DEVE conter a linha de código C++ exata que resultou na sua criação.
    - **Pinos**: Cada nó deve ter uma lista detalhada de 'pins', cada um com um 'id' único globalmente. Conexões usam 'fromPinId' e 'toPinId'.

    **Código C++ para Análise:**
    \`\`\`cpp
    ${cppCode}
    \`\`\`

    Gere o objeto JSON completo agora, analisando todas as funções no código fornecido.
  `;
  
  let rawResponseText = '';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    
    rawResponseText = response.text;
    let jsonText = rawResponseText.trim();

    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
    }
    
    return JSON.parse(jsonText) as BlueprintResponse;

  } catch (error) {
    console.error("Error calling or parsing Gemini API response:", error);
    console.error("Raw response text that caused the error:\n", rawResponseText);
    if (error instanceof Error) {
        throw new Error(`A chamada para a API Gemini falhou ou a resposta não era um JSON válido: ${error.message}`);
    }
    throw new Error("Ocorreu um erro desconhecido ao se comunicar com a API Gemini.");
  }
};

export const generateCppCode = async (graphData: GraphData): Promise<CppCodeResponse> => {
  if (!graphData || graphData.nodes.length === 0) {
    throw new Error("O grafo de Blueprint não pode estar vazio.");
  }

  const model = "gemini-2.5-pro";

  const prompt = `
    Você é um desenvolvedor especialista em Unreal Engine 5 C++. Sua tarefa é converter uma representação JSON de um grafo de Blueprint em código C++ para uma nova classe AActor.

    **JSON de Entrada:**
    O JSON a seguir descreve os nós, conexões, variáveis e definições de funções/eventos personalizados.
    - 'nodes': A lista de nós do Blueprint. Nós com 'type: 'event'' são pontos de entrada para a lógica.
    - 'connections': O fluxo de execução e de dados.
    - 'variables': Variáveis de membro para a classe.
    - 'customEvents': Definições para eventos personalizados. A implementação para estes é encontrada no grafo de 'nodes', começando pelo nó com o nome correspondente.
    - 'customFunctions': Definições para funções personalizadas. Estas funções devem ser criadas com corpos vazios, pois sua lógica não é definida neste grafo; elas estão apenas sendo chamadas.

    \`\`\`json
    ${JSON.stringify(graphData, null, 2)}
    \`\`\`

    **Instruções:**
    1.  Crie uma nova classe C++ que herda de 'AActor'. Nomeie-a 'MyBlueprintActor'.
    2.  **Arquivo de Cabeçalho (.h):**
        -   Declare todas as variáveis da lista 'variables' como UPROPERTYs. Use 'EditAnywhere' e 'BlueprintReadWrite'. Escolha tipos C++ apropriados (e.g., 'bool' para Boolean, 'int32' para Integer, 'FString' para String).
        -   Para cada função em 'customFunctions', declare uma 'UFUNCTION(BlueprintCallable)' correspondente.
        -   Para cada evento em 'customEvents', declare uma 'UFUNCTION(BlueprintCallable)' correspondente.
        -   Declare também eventos nativos como 'BeginPlay' ou 'Tick' se eles forem usados como pontos de entrada no grafo.
    3.  **Arquivo de Origem (.cpp):**
        -   Implemente a lógica para cada evento/função que tenha um nó de ponto de entrada no grafo (e.g., 'BeginPlay', eventos personalizados). Siga as 'connections' para estruturar o código corretamente.
        -   Para cada função de 'customFunctions', forneça uma implementação C++ vazia.
        -   Use a sintaxe e as convenções padrão do C++ da UE5.
    4.  **Formato de Saída:**
        -   Sua resposta DEVE ser um único objeto JSON válido.
        -   O objeto JSON deve ter duas chaves: "header" e "source".
        -   O valor da chave "header" deve ser o código completo para o arquivo '.h' como uma string.
        -   O valor da chave "source" deve ser o código completo para o arquivo '.cpp' como uma string.

    Gere o objeto JSON contendo o código C++ agora.
  `;
  
  const cppResponseSchema = {
      type: Type.OBJECT,
      properties: {
          header: {
              type: Type.STRING,
              description: "O conteúdo completo do arquivo de cabeçalho C++ (.h)."
          },
          source: {
              type: Type.STRING,
              description: "O conteúdo completo do arquivo de origem C++ (.cpp)."
          }
      },
      required: ['header', 'source']
  };

  try {
      const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: cppResponseSchema,
          },
      });

      const jsonText = response.text.trim();
      return JSON.parse(jsonText) as CppCodeResponse;
  } catch (error) {
    console.error("Error calling or parsing Gemini API response for C++ generation:", error);
    if (error instanceof Error) {
        throw new Error(`A chamada para a API Gemini falhou ou a resposta não era um JSON válido: ${error.message}`);
    }
    throw new Error("Ocorreu um erro desconhecido ao se comunicar com a API Gemini.");
  }
};
