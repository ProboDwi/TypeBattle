import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeInternalPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const safeNext = safeInternalPath(url.searchParams.get("next"));

  if (code || (tokenHash && typeParam)) {
    try {
      const supabase = await createClient();
      const { error } =
        tokenHash && typeParam && emailOtpTypes.has(typeParam as EmailOtpType)
          ? await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: typeParam as EmailOtpType,
            })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("Unsupported authentication link") };

      if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    } catch {
      // Redirect below keeps configuration errors out of the response body.
    }
  }
  return NextResponse.redirect(
    new URL(
      "/auth/sign-in?message=Tautan%20verifikasi%20tidak%20valid%20atau%20sudah%20kedaluwarsa.",
      url.origin,
    ),
  );
}
