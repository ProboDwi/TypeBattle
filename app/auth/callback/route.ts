import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const safeNext = safeInternalPath(url.searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    } catch {
      // Redirect below keeps configuration errors out of the response body.
    }
  }
  return NextResponse.redirect(
    new URL(
      "/auth/sign-in?message=Tautan%20autentikasi%20tidak%20valid.",
      url.origin,
    ),
  );
}
