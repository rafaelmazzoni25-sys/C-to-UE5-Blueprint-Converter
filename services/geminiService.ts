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
    Você é um desenvolvedor especialista em Unreal Engine 5, mestre em Blueprints. Sua tarefa é analisar o código C++ e gerar um guia e dados para um grafo de Blueprints.
    Sua resposta DEVE ser um único objeto JSON VÁLIDO que corresponda ao schema.

    **Regras para o Guia (Markdown):**
    - Use cabeçalhos e listas. Destaque nomes de nós com \`backticks\`.

    **Regras para o 'graphData' (JSON):**
    - **nodes**: Cada nó deve ter uma lista de 'pins'.
      - **pins**: Cada pino deve ter um 'id' único globalmente, 'name', 'type' ('exec' ou 'data'), 'direction' ('in' ou 'out') e 'dataType' (e.g., 'Exec', 'Integer', 'Boolean', 'String'). Pinos 'Exec' devem ter dataType 'Exec'.
    - **connections**: Conecte nós usando 'fromPinId' e 'toPinId'. A conexão deve ser entre um pino 'out' e um pino 'in' compatível.
    - **codeSnippet**: O campo 'codeSnippet' (opcional) no nó DEVE conter a linha de código C++ exata que resultou na criação do nó.

    **Exemplo de Resposta JSON Esperada:**
    \`\`\`json
    {
      "guide": "## Visão Geral\\nCrie uma variável para vida...",
      "graphData": {
        "variables": [{"name": "Vida", "type": "Integer"}],
        "nodes": [
          {
            "id": "node-1", "name": "Event BeginPlay", "type": "event", "x": 100, "y": 200,
            "pins": [
              {"id": "pin-1-exec-out", "name": "", "type": "exec", "direction": "out", "dataType": "Exec"}
            ]
          },
          {
            "id": "node-2", "name": "Set Vida", "type": "variable_set", "x": 350, "y": 200, "codeSnippet": "vida = 100;",
            "pins": [
              {"id": "pin-2-exec-in", "name": "", "type": "exec", "direction": "in", "dataType": "Exec"},
              {"id": "pin-2-exec-out", "name": "", "type": "exec", "direction": "out", "dataType": "Exec"},
              {"id": "pin-2-data-in", "name": "Vida", "type": "data", "direction": "in", "dataType": "Integer"}
            ]
          },
          {
            "id": "node-3", "name": "100", "type": "literal", "x": 300, "y": 280, "properties": {"value": "100"}, "codeSnippet": "100",
            "pins": [
              {"id": "pin-3-data-out", "name": "", "type": "data", "direction": "out", "dataType": "Integer"}
            ]
          }
        ],
        "connections": [
          {"fromPinId": "pin-1-exec-out", "toPinId": "pin-2-exec-in"},
          {"fromPinId": "pin-3-data-out", "toPinId": "pin-2-data-in"}
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
