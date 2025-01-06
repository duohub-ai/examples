import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

// Types and Interfaces
type Role = 'user' | 'assistant' | 'system';

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
const API_KEY = process.env.DUOHUB_API_KEY!;
const BASE_URL = 'https://api.duohub.ai';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

// Helper Functions
function validateRole(role: string): role is Role {
  const validRoles: Role[] = ['user', 'assistant', 'system'];
  return validRoles.includes(role as Role);
}

function buildQueryParams(params: QueryParams): QueryParams {
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  ) as QueryParams;
}

async function getMessages(params: QueryParams): Promise<DuoHubResponse<{ messages: Message[] }>> {
  const queryParams = buildQueryParams(params);
  
  const response = await axios.get<DuoHubResponse<{ messages: Message[] }>>(
    `${BASE_URL}/messages/list`,
    { headers, params: queryParams }
  );
  
  return response.data;
}

// Lambda Handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract query parameters
    const queryParams = event.queryStringParameters || {};
    
    const sessionId = queryParams.sessionID;
    const customerUserId = queryParams.customerUserID;
    const role = queryParams.role;
    
    // Parse and validate limit
    let limit = 20;
    try {
      const parsedLimit = parseInt(queryParams.limit || '20', 10);
      if (parsedLimit >= 1 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    } catch {
      // Keep default limit if parsing fails
    }

    const nextToken = queryParams.nextToken;
    const previousToken = queryParams.previousToken;

    // Validate parameters
    if (!sessionId && !customerUserId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Either sessionID or customerUserID must be provided'
        })
      };
    }

    if (role && !validateRole(role)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid role. Must be one of: user, assistant, system'
        })
      };
    }

    // Build params object for API call
    const params: QueryParams = {
      sessionID: sessionId,
      customerUserID: customerUserId,
      role: role as Role | undefined,
      limit,
      // If both tokens are provided, prioritize nextToken
      nextToken: nextToken || undefined,
      previousToken: nextToken ? undefined : previousToken
    };

    // Get messages
    const responseData = await getMessages(params);

    // Extract pagination data
    const data = responseData.data;
    const pagination: PaginationMetadata = {
      nextToken: data.nextToken,
      previousToken: data.previousToken,
      totalCount: data.totalCount
    };

    // Build response
    const response = {
      messages: data.messages,
      pagination
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;
      
      return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorMessage })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    };
  }
};