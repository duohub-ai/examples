import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import OpenAI from "openai";
import axios from "axios";

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
const API_KEY = process.env.DUOHUB_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const BASE_URL = "https://api.duohub.ai";

const headers = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Helper Functions
async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const response = await axios.get<DuoHubResponse<Session>>(
      `${BASE_URL}/sessions/get/${sessionId}`,
      { headers }
    );
    return response.data.data;
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

  const response = await axios.post<DuoHubResponse<Session>>(
    `${BASE_URL}/sessions/create`,
    payload,
    { headers }
  );
  return response.data.data;
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

  const response = await axios.post<DuoHubResponse<Message>>(
    `${BASE_URL}/messages/create`,
    payload,
    { headers }
  );
  return response.data.data;
}

async function retrieveMemory(
  memoryId: string,
  query: string,
  assisted: boolean = true
): Promise<any> {
  const params = {
    memoryID: memoryId,
    query,
    assisted,
  };

  const response = await axios.get(`${BASE_URL}/memory/`, { headers, params });
  return response.data;
}

interface MessagesResponse {
  messages: Message[];
  totalCount: number;
}

async function listMessages(
  sessionId: string,
  customerUserId?: string
): Promise<MessagesResponse> {
  const params = {
    sessionID: sessionId,
    limit: 20,
    ...(customerUserId && { customerUserID: customerUserId }),
  };

  const response = await axios.get<DuoHubResponse<MessagesResponse>>(
    `${BASE_URL}/messages/list`,
    { headers, params }
  );

  const data = response.data.data;
  if (data.messages) {
    data.messages.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
  }

  return data;
}

function parseToOpenAIFormat(
  messages: Message[]
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

// Lambda Handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse input parameters
    const body: ChatRequestBody = event.body ? JSON.parse(event.body) : {};

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
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Missing required parameters: content, memoryID, or customerUserID",
        }),
      };
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
      model: "gpt-4o",
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: assistantResponse,
        sessionID: sessionData.id,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};
