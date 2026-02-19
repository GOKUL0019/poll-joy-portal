import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if email is authorized
    const { data: authorized } = await supabaseAdmin
      .from("authorized_emails")
      .select("*")
      .eq("email", email)
      .single();

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: "Email not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (authorized.is_registered) {
      return new Response(
        JSON.stringify({ error: "Already registered", already_registered: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with phone as password
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: authorized.phone,
      email_confirm: true,
      user_metadata: { full_name: authorized.full_name, phone: authorized.phone },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with all fields
    await supabaseAdmin
      .from("profiles")
      .update({
        phone: authorized.phone,
        full_name: authorized.full_name,
        gender: authorized.gender,
        hostel: authorized.hostel,
        is_visible: authorized.is_visible,
      })
      .eq("user_id", user.user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
