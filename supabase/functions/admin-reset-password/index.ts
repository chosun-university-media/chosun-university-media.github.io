import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "로그인이 필요합니다." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "인증 서버 설정을 확인해 주세요." }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "로그인이 필요합니다." }, 401);

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role,status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin" || profile?.status !== "approved") {
    return json({ error: "관리자만 비밀번호를 재설정할 수 있습니다." }, 403);
  }

  let body: { userId?: string; newPassword?: string } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "요청 내용을 확인해 주세요." }, 400);
  }
  const userId = String(body.userId || "").trim();
  const newPassword = String(body.newPassword || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "회원 정보를 확인해 주세요." }, 400);
  if (newPassword.length < 8 || newPassword.length > 72) return json({ error: "비밀번호는 8~72자로 입력해 주세요." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return json({ error: "비밀번호를 재설정하지 못했습니다." }, 500);

  return json({ success: true });
});
