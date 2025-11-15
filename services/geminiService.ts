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
  type: 'event' | 'function' | 'variable_get' | 'variable_set' | 'flow_control' | 'literal';
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

export interface GraphData {
    nodes: GraphNode[];
    connections: GraphConnection[];
    variables: GraphVariable[];
}

// New interface for a single Blueprint graph with its context
export interface BlueprintGraph {
    name: string;
    description: string;
    graphData: GraphData;
}

// Updated main response structure
export interface BlueprintResponse {
    guide: string;
    blueprintGraphs: BlueprintGraph[];
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

    // Clean potential markdown fences from the response
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