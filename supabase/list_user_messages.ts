// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { corsHeaders } from "../_shared/cors.ts";

// Types and Interfaces
type Role = "user" | "assistant" | "system";

interface Message {
  id: string;
  sessionID: string;
  customerUserID?: string;
  role: Role;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface QueryParams {
  sessionID?: string;
  customerUserID?: string;
  role?: Role;
  limit?: number;
  nextToken?: string;
  previousToken?: string;
}

interface PaginationMetadata {
  nextToken?: string;
  previousToken?: string;
  totalCount: number;
}

interface DuoHubResponse<T> {
  status: string;
  data: T & {
    nextToken?: string;
    previousToken?: string;
    totalCount: number;
    messages: Message[];
  };
}

// Configuration
const API_KEY = Deno.env.get("DUOHUB_API_KEY")!;
const BASE_URL = "https://api.duohub.ai";

const headers = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

// Helper Functions
function validateRole(role: string): role is Role {
  const validRoles: Role[] = ["user", "assistant", "system"];
  return validRoles.includes(role as Role);
}

function buildQueryParams(params: QueryParams): URLSearchParams {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}

async function getMessages(
  params: QueryParams
): Promise<DuoHubResponse<{ messages: Message[] }>> {
  const queryParams = buildQueryParams(params);

  const response = await fetch(
    `${BASE_URL}/messages/list?${queryParams.toString()}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

console.log("List messages function up and running!");

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get URL object to parse query parameters
    const url = new URL(req.url);
    const queryParams = url.searchParams;

    const sessionId = queryParams.get("sessionID") || undefined;
    const customerUserId = queryParams.get("customerUserID") || undefined;
    const role = queryParams.get("role") || undefined;

    // Parse and validate limit
    let limit = 20;
    const limitParam = queryParams.get("limit");
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (parsedLimit >= 1 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    const nextToken = queryParams.get("nextToken") || undefined;
    const previousToken = queryParams.get("previousToken") || undefined;

    // Validate parameters
    if (!sessionId && !customerUserId) {
      return new Response(
        JSON.stringify({
          error: "Either sessionID or customerUserID must be provided",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (role && !validateRole(role)) {
      return new Response(
        JSON.stringify({
          error: "Invalid role. Must be one of: user, assistant, system",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build params object for API call
    const params: QueryParams = {
      sessionID: sessionId,
      customerUserID: customerUserId,
      role: role as Role | undefined,
      limit,
      // If both tokens are provided, prioritize nextToken
      nextToken: nextToken || undefined,
      previousToken: nextToken ? undefined : previousToken,
    };

    // Get messages
    const responseData = await getMessages(params);

    // Extract pagination data
    const data = responseData.data;
    const pagination: PaginationMetadata = {
      nextToken: data.nextToken,
      previousToken: data.previousToken,
      totalCount: data.totalCount,
    };

    // Build response
    const response = {
      messages: data.messages,
      pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
