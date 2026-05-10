import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND}/api/analyze`, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      duplex: "half",
    } as RequestInit);
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ detail: "Analysis service unavailable" }, { status: 503 });
  }
}
