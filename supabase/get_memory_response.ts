// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { corsHeaders } from "../_shared/cors.ts";

// Types and interfaces
interface QueryRequest {
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

interface QueryResponse {
  success: boolean;
  message: string;
  answer: string;
  facts: Array<{
    text: string;
    relevance: number;
  }>;
}

// Configuration
const API_KEY = Deno.env.get("API_KEY")!;

console.log("Memory query function up and running!");

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { query, memoryID }: QueryRequest = await req.json();

    // Validate required fields
    if (!query) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Query parameter is required",
          answer: "",
          facts: [],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construct query parameters
    const params = new URLSearchParams({
      query,
      ...(memoryID && { memoryID }),
      assisted: "true",
      facts: "true",
    });

    // Make request to DuoHub API
    const response = await fetch(
      `https://api.duohub.ai/memory/?${params.toString()}`,
      {
        headers: {
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: MemoryRetrieverResponse = await response.json();

    const result: QueryResponse = {
      success: true,
      message: "Query executed successfully.",
      answer: data.payload,
      facts: data.facts,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error querying memory retriever:", error);

    const errorResponse: QueryResponse = {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      answer: "",
      facts: [],
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
