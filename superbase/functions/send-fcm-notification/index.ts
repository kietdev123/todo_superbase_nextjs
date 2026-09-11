import { JWT } from "npm:google-auth-library@10.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const firebaseMessagingScope =
  "https://www.googleapis.com/auth/firebase.messaging";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type SendNotificationPayload = {
  userId: string;
  title: string;
  body: string;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function getSupabasePublishableKey(): string | null {
  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacyAnonKey) return legacyAnonKey;

  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!publishableKeys) return null;

  try {
    const keys = JSON.parse(publishableKeys) as Record<string, unknown>;
    return typeof keys.default === "string" ? keys.default : null;
  } catch {
    return null;
  }
}

function getFirebaseServiceAccount(): FirebaseServiceAccount {
  const rawServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!rawServiceAccount) {
    throw new Error("Thiếu secret FIREBASE_SERVICE_ACCOUNT_JSON.");
  }

  const serviceAccount = JSON.parse(rawServiceAccount) as Partial<
    FirebaseServiceAccount
  >;

  if (
    typeof serviceAccount.project_id !== "string" ||
    typeof serviceAccount.client_email !== "string" ||
    typeof serviceAccount.private_key !== "string"
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON không đúng định dạng.");
  }

  return serviceAccount as FirebaseServiceAccount;
}

function parsePayload(value: unknown): SendNotificationPayload | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Record<string, unknown>;
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    ) ||
    title.length < 1 ||
    title.length > 200 ||
    body.length < 1 ||
    body.length > 1000
  ) {
    return null;
  }

  return { userId, title, body };
}

async function getFirebaseAccessToken(
  serviceAccount: FirebaseServiceAccount,
): Promise<string> {
  const jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [firebaseMessagingScope],
  });

  const tokens = await jwtClient.authorize();
  if (!tokens.access_token) {
    throw new Error("Không thể tạo Firebase OAuth access token.");
  }

  return tokens.access_token;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Phương thức không được hỗ trợ." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Thiếu access token." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabasePublishableKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabasePublishableKey) {
    return json({ error: "Edge Function chưa có cấu hình Supabase." }, 500);
  }

  let payload: SendNotificationPayload | null = null;
  try {
    payload = parsePayload(await request.json());
  } catch {
    return json({ error: "Request body không phải JSON hợp lệ." }, 400);
  }

  if (!payload) {
    return json(
      {
        error:
          "Cần userId hợp lệ, title từ 1-200 ký tự và body từ 1-1000 ký tự.",
      },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: fcmToken, error: tokenError } = await supabase.rpc(
    "admin_get_user_fcm_token",
    { target_user_id: payload.userId },
  );

  if (tokenError) {
    const status = tokenError.code === "42501" ? 403 : 400;
    return json({ error: tokenError.message }, status);
  }

  if (typeof fcmToken !== "string" || !fcmToken) {
    return json({ error: "User chưa có FCM token." }, 400);
  }

  try {
    const serviceAccount = getFirebaseServiceAccount();
    const firebaseAccessToken = await getFirebaseAccessToken(serviceAccount);
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseAccessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title: payload.title,
              body: payload.body,
            },
          },
        }),
      },
    );

    const fcmResult = (await fcmResponse.json()) as {
      name?: string;
      error?: { message?: string; status?: string };
    };

    if (!fcmResponse.ok) {
      return json(
        {
          error: fcmResult.error?.message ?? "Firebase từ chối thông báo.",
          firebaseStatus: fcmResult.error?.status,
        },
        fcmResponse.status >= 500 ? 502 : 400,
      );
    }

    return json({
      message: "Đã gửi thông báo.",
      messageId: fcmResult.name,
    });
  } catch (error) {
    console.error("Không thể gửi FCM notification", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể gửi thông báo FCM.",
      },
      500,
    );
  }
});
