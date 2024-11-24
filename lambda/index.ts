import { Handler } from "aws-lambda";
import axios from "axios";
import process from "process";

interface LambdaEvent {
  query: string;
  memoryID?: string;
}

interface MemoryRetrieverResponse {
  payload: string;
  facts: Array<{
    text: string;
    relevance: number;
  }>;
}

interface LambdaResponse {
  success: boolean;
  message: string;
  answer: string;
  facts: Array<{
    text: string;
    relevance: number;
  }>;
}

export const handler: Handler<LambdaEvent, LambdaResponse> = async (event) => {
  try {
    const { query, memoryID } = event;

    const params = new URLSearchParams({
      query,
      ...(memoryID && { memoryID }),
      assisted: "true",
      facts: "true",
    });

    const response = await axios.get<MemoryRetrieverResponse>(
      `https://api.duohub.ai/memory/?${params.toString()}`,
      {
        headers: {
          "X-API-KEY": process.env.API_KEY as string,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      message: "Query executed successfully.",
      answer: response.data.payload,
      facts: response.data.facts,
    };
  } catch (err) {
    console.error("Error querying memory retriever:", err);
    return {
      success: false,
      message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      answer: "",
      facts: [],
    };
  }
};
