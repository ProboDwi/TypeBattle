import { NextResponse } from "next/server";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: Record<string, string[]> | null;
}

export function apiSuccess<T>(data: T, message = "Berhasil.", status = 200) {
  return NextResponse.json<ApiEnvelope<T>>(
    { success: true, data, message, errors: null },
    { status },
  );
}

export function apiError(
  message: string,
  status = 400,
  errors: Record<string, string[]> | null = null,
) {
  return NextResponse.json<ApiEnvelope<null>>(
    { success: false, data: null, message, errors },
    { status },
  );
}

export function apiErrorWithData<T>(
  message: string,
  data: T,
  status = 409,
  errors: Record<string, string[]> | null = null,
) {
  return NextResponse.json<ApiEnvelope<T>>(
    { success: false, data, message, errors },
    { status },
  );
}
