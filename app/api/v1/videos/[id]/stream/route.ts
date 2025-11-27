import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTREAM_BASE = process.env.STREAM_UPSTREAM_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const FORWARD_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
  "etag",
  "last-modified",
  "cache-control",
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing video id" }, { status: 400 });

  const searchParams = new URL(req.url).searchParams;
  const token = searchParams.get("token") ?? undefined;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  searchParams.delete("token");

  // Preserve any query string (e.g., quality params)
  const remainingSearch = searchParams.toString();
  const upstreamUrl = new URL(
    `/api/v1/videos/${encodeURIComponent(id)}/stream${remainingSearch ? `?${remainingSearch}` : ""}`,
    UPSTREAM_BASE,
  );

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const range = req.headers.get("range");
  if (range) headers.Range = range;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  req.signal.addEventListener("abort", onAbort);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    const responseHeaders = new Headers();
    for (const h of FORWARD_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    console.error("Stream proxy error", error);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  } finally {
    req.signal.removeEventListener("abort", onAbort);
  }
}
