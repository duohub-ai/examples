// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Types and interfaces
interface Session {
  id: string;
  organisationID: string;
  customerUserID: string;
  metadata?: any[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  endedAt?: string;
}

interface Message {
  id: string;
  sessionID: string;
  customerUserID?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DuoHubResponse<T> {
  status: string;
  data: T;
}

interface ChatRequestBody {
  content: string;
  memoryID: string;
  customerUserID: string;
  sessionID?: string;
  metadata?: any[];
  assisted?: boolean;
}

// Configuration
const API_KEY = Deno.env.get("DUOHUB_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const BASE_URL = "https://api.duohub.ai";

const headers = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Helper Functions
async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const response = await fetch(`${BASE_URL}/sessions/get/${sessionId}`, {
      headers,
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    return null;
  }
}

async function createSession(
  customerUserId: string,
  metadata?: any[]
): Promise<Session> {
  const payload = {
    customerUserID: customerUserId,
    ...(metadata && { metadata }),
  };

  const response = await fetch(`${BASE_URL}/sessions/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return data.data;
}

async function createMessage(
  sessionId: string,
  content: string,
  role: "user" | "assistant" | "system",
  customerUserId?: string
): Promise<Message> {
  const payload = {
    sessionID: sessionId,
    role,
    content,
    ...(customerUserId && { customerUserID: customerUserId }),
  };

  const response = await fetch(`${BASE_URL}/messages/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return data.data;
}

async function retrieveMemory(
  memoryId: string,
  query: string,
  assisted: boolean = true
): Promise<any> {
  const params = new URLSearchParams({
    memoryID: memoryId,
    query,
    assisted: assisted.toString(),
  });

  const response = await fetch(`${BASE_URL}/memory/?${params}`, {
    headers,
  });
  return response.json();
}

interface MessagesResponse {
  messages: Message[];
  totalCount: number;
}

async function listMessages(
  sessionId: string,
  customerUserId?: string
): Promise<MessagesResponse> {
  const params = new URLSearchParams({
    sessionID: sessionId,
    limit: "20",
    ...(customerUserId && { customerUserID: customerUserId }),
  });

  const response = await fetch(`${BASE_URL}/messages/list?${params}`, {
    headers,
  });
  const data = await response.json();

  if (data.data.messages) {
    data.data.messages.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
  }

  return data.data;
}

function parseToOpenAIFormat(
  messages: Message[]
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

console.log("Chat handler function is running!");

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse input parameters
    const body: ChatRequestBody = await req.json();

    const {
      content,
      memoryID,
      customerUserID,
      sessionID,
      metadata,
      assisted = true,
    } = body;

    // Validate required parameters
    if (!content || !memoryID || !customerUserID) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: content, memoryID, or customerUserID",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if session exists or create new one
    let sessionData: Session;
    if (sessionID) {
      const existingSession = await getSession(sessionID);
      sessionData =
        existingSession || (await createSession(customerUserID, metadata));
    } else {
      sessionData = await createSession(customerUserID, metadata);
    }

    // Create user message
    await createMessage(sessionData.id, content, "user", customerUserID);

    // Get memory context
    const memoryResponse = await retrieveMemory(memoryID, content, assisted);

    // Get chat history
    const chatHistory = await listMessages(sessionData.id);
    const chatMessages = parseToOpenAIFormat(chatHistory.messages);

    // Create completion request
    const messages = [
      { role: "system", content: memoryResponse.payload || "" },
      ...chatMessages,
    ];

    // Get OpenAI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    const assistantResponse = completion.choices[0].message.content;

    // Create assistant message
    await createMessage(
      sessionData.id,
      assistantResponse,
      "assistant",
      customerUserID
    );

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        sessionID: sessionData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
