import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";

// Types and Interfaces
interface CreateUserRequest {
  firstName: string;
  lastName: string;
  id?: string;
  email?: string;
  phone?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

interface DuoHubResponse<T> {
  status: string;
  data: T;
}

// Configuration
const API_KEY = process.env.DUOHUB_API_KEY!;
const BASE_URL = "https://api.duohub.ai";

const headers = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

// Helper Functions
function validateEmail(email: string | undefined): boolean {
  if (!email) {
    return true; // Email is optional
  }
  return email.includes("@") && email.split("@")[1].includes(".");
}

function validatePhone(phone: string | undefined): boolean {
  if (!phone) {
    return true; // Phone is optional
  }
  return phone.replace(/[\s\-\+]/g, "").length >= 10;
}

async function createUser(
  params: CreateUserRequest
): Promise<DuoHubResponse<User>> {
  const payload: CreateUserRequest = {
    firstName: params.firstName,
    lastName: params.lastName,
  };

  if (params.id) payload.id = params.id;
  if (params.email) payload.email = params.email;
  if (params.phone) payload.phone = params.phone;

  const response = await axios.post<DuoHubResponse<User>>(
    `${BASE_URL}/users/create`,
    payload,
    { headers }
  );

  return response.data;
}

// Lambda Handler
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse input parameters
    const body: CreateUserRequest = event.body ? JSON.parse(event.body) : {};

    // Extract fields
    const { firstName, lastName, id: userId, email, phone } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: firstName and lastName are required",
        }),
      };
    }

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid email format",
        }),
      };
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid phone format. Must be at least 10 digits",
        }),
      };
    }

    // Create user
    const responseData = await createUser({
      firstName,
      lastName,
      id: userId,
      email,
      phone,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;

      return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Internal server error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }),
    };
  }
};
