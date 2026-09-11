import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "Phương thức không được hỗ trợ." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Thiếu access token." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Edge Function chưa có cấu hình Supabase." }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data, error } = await supabase
    .from("todos")
    .select("completed");

  if (error) {
    return json({ error: error.message }, 400);
  }

  const completed = data.filter((todo) => todo.completed).length;

  return json({
    total: data.length,
    completed,
    pending: data.length - completed,
  });
});

