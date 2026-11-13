import { NextResponse, type NextRequest } from "next/server";

// The Grievance Service's public area list (Region > Zone > Woreda > Kebele). It sends no CORS headers and DA Services has
// no route for it, so the browser reads it through here. Only the known parent ids go out, to one fixed host.
export const dynamic = "force-dynamic";

const PARENT = /^(region|zone|woreda)-ET\d+$/;
const TIMEOUT_MS = 20_000;
const base = () => (process.env.GRIEVANCE_BASE_URL ?? "https://grievance.development.oanstaging.com/api").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");
  if (parent && !PARENT.test(parent)) return NextResponse.json({ message: "Unknown area." }, { status: 400 });
  const query = parent ? `?parent=${encodeURIComponent(parent)}` : "";
  try {
    const res = await fetch(`${base()}/v1/administrative-areas${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return NextResponse.json({ message: "The Grievance Service could not list the areas." }, { status: 502 });
    const body = (await res.json()) as { data?: { areas?: unknown[] } };
    return NextResponse.json({ areas: body.data?.areas ?? [] });
  } catch {
    return NextResponse.json({ message: "The Grievance Service could not list the areas." }, { status: 502 });
  }
}
