// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { corsHeaders } from "../_shared/cors.ts";

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
const API_KEY = Deno.env.get("DUOHUB_API_KEY")!;
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

  const response = await fetch(`${BASE_URL}/users/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create user");
  }

  return response.json();
}

console.log(`Function "create-user" up and running!`);

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse input parameters
    const body: CreateUserRequest = await req.json();

    // Extract fields
    const { firstName, lastName, id: userId, email, phone } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: firstName and lastName are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return new Response(
        JSON.stringify({
          error: "Invalid phone format. Must be at least 10 digits",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create user
    const responseData = await createUser({
      firstName,
      lastName,
      id: userId,
      email,
      phone,
    });

    return new Response(JSON.stringify(responseData), {
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
