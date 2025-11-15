import { GoogleGenAI, Type } from "@google/genai";

// --- Data Structures for Blueprint Visualization ---

export interface GraphNode {
  id: string;
  name: string;
  type: 'event' | 'function' | 'variable_get' | 'variable_set' | 'flow_control' | 'literal';
  x: number;
  y: number;
  properties?: { value?: string };
  codeSnippet?: string;
}

export interface GraphConnection {
  fromNodeId: string;
  toNodeId: string;
  type: 'exec' | 'data';
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

export interface BlueprintResponse {
    guide: string;
    graphData: GraphData;
}


// --- Gemini API Service ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    guide: {
      type: Type.STRING,
      description: "Guia passo a passo em formato markdown."
    },
    graphData: {
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
                description: "Propriedades adicionais para o nó, como o valor de um literal.",
                properties: {
                    value: { type: Type.STRING, description: "O valor de um nó literal." }
                },
              },
              codeSnippet: {
                type: Type.STRING,
                description: "O trecho de código C++ original que corresponde a este nó."
              }
            },
            required: ['id', 'name', 'type', 'x', 'y']
          }
        },
        connections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fromNodeId: { type: Type.STRING },
              toNodeId: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ['fromNodeId', 'toNodeId', 'type']
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
    }
  },
  required: ['guide', 'graphData']
};


export const generateBlueprintGuide = async (cppCode: string): Promise<BlueprintResponse> => {
  if (!cppCode.trim()) {
    throw new Error("O código C++ não pode estar vazio.");
  }

  const model = "gemini-2.5-pro";

  const prompt = `
    Você é um desenvolvedor especialista em Unreal Engine 5, mestre em Blueprints. Sua tarefa é analisar o código C++ fornecido e gerar duas saídas:
    1. Um guia detalhado em formato Markdown sobre como replicar a funcionalidade em Blueprints.
    2. Dados estruturados em JSON para visualizar o grafo de Blueprints.

    Sua resposta DEVE ser um único objeto JSON VÁLIDO, sem nenhuma formatação ou texto extra como markdown backticks (\`\`\`), que corresponda ao schema fornecido.

    **Regras para o Guia (Markdown):**
    - Use cabeçalhos (##, ###) para organização.
    - Use listas numeradas para passos.
    - Destaque nomes de nós, variáveis e pinos com \`backticks\`.

    **Regras para o 'graphData' (JSON):**
    - **nodes**: 'id' deve ser único. 'type' pode ser 'event', 'function', 'variable_get', 'variable_set', 'flow_control', ou 'literal'. As coordenadas 'x' e 'y' devem criar um layout legível da esquerda para a direita. O campo 'properties' é opcional e só deve ser usado para nós do tipo 'literal' para especificar seu valor. O campo 'codeSnippet' (opcional) DEVE conter a linha ou bloco de código C++ exato que resultou na criação deste nó; isso é crucial para mapear a visualização de volta ao código-fonte.
    - **connections**: Conecte nós usando seus 'id's. 'type' pode ser 'exec' (fluxo de execução) ou 'data' (fluxo de dados).
    - **variables**: Liste todas as variáveis necessárias com seu nome e tipo (ex: 'Integer', 'Boolean').

    **Exemplo de Resposta JSON Esperada:**
    \`\`\`json
    {
      "guide": "## Visão Geral\\nCrie uma variável para armazenar a vida do jogador...",
      "graphData": {
        "variables": [{"name": "Vida", "type": "Integer"}],
        "nodes": [
          {"id": "node-1", "name": "Event BeginPlay", "type": "event", "x": 100, "y": 200},
          {"id": "node-2", "name": "Set Vida", "type": "variable_set", "x": 350, "y": 200, "codeSnippet": "vida = 100;"},
          {"id": "node-3", "name": "100", "type": "literal", "x": 350, "y": 280, "properties": {"value": "100"}, "codeSnippet": "100"}
        ],
        "connections": [
          {"fromNodeId": "node-1", "toNodeId": "node-2", "type": "exec"},
          {"fromNodeId": "node-3", "toNodeId": "node-2", "type": "data"}
        ]
      }
    }
    \`\`\`

    **Código C++ para Análise:**
    \`\`\`cpp
    ${cppCode}
    \`\`\`

    Gere o objeto JSON completo agora.
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

    // FIX: Clean potential markdown fences from the response
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
    }
    
    return JSON.parse(jsonText) as BlueprintResponse;

  } catch (error) {
    console.error("Error calling or parsing Gemini API response:", error);
    console.error("Raw response text that caused the error:\n", rawResponseText); // Log the problematic text
    if (error instanceof Error) {
        throw new Error(`A chamada para a API Gemini falhou ou a resposta não era um JSON válido: ${error.message}`);
    }
    throw new Error("Ocorreu um erro desconhecido ao se comunicar com a API Gemini.");
  }
};