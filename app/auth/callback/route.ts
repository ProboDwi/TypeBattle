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

function invalidLinkRedirect(origin: string, status: 303 | 307 = 307) {
  return NextResponse.redirect(
    new URL(
      "/auth/sign-in?message=Tautan%20verifikasi%20tidak%20valid%20atau%20sudah%20kedaluwarsa.",
      origin,
    ),
    status,
  );
}

function confirmedLoginRedirect(origin: string) {
  return NextResponse.redirect(
    new URL(
      "/auth/sign-in?message=Email%20berhasil%20dikonfirmasi.%20Silakan%20masuk.",
      origin,
    ),
  );
}

async function verifyTokenHash(tokenHash: string, typeParam: string) {
  if (!emailOtpTypes.has(typeParam as EmailOtpType)) return false;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeParam as EmailOtpType,
  });
  return !error;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const safeNext = safeInternalPath(url.searchParams.get("next"));

  if (code || (tokenHash && typeParam)) {
    try {
      if (tokenHash && typeParam) {
        const verified = await verifyTokenHash(tokenHash, typeParam);
        if (verified)
          return NextResponse.redirect(new URL(safeNext, url.origin));
      } else if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error)
          return NextResponse.redirect(new URL(safeNext, url.origin));

        // Supabase has already consumed the one-time confirmation link before
        // redirecting here. On another device the PKCE verifier cookie is not
        // available, so automatic sign-in can fail although email confirmation
        // itself succeeded.
        return confirmedLoginRedirect(url.origin);
      }
    } catch {
      // Redirect below keeps configuration errors out of the response body.
    }
  }
  return invalidLinkRedirect(url.origin);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  try {
    const formData = await request.formData();
    const tokenHash = formData.get("token_hash");
    const typeParam = formData.get("type");
    const nextParam = formData.get("next");

    if (typeof tokenHash === "string" && typeof typeParam === "string") {
      const verified = await verifyTokenHash(tokenHash, typeParam);
      if (verified) {
        const safeNext = safeInternalPath(
          typeof nextParam === "string" ? nextParam : null,
        );
        return NextResponse.redirect(new URL(safeNext, url.origin), 303);
      }
    }
  } catch {
    // Keep malformed or expired token details out of the response.
  }
  return invalidLinkRedirect(url.origin, 303);
}
