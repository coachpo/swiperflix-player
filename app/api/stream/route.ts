import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FORWARD_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
  "etag",
  "last-modified",
  "cache-control",
];
const CACHE_FALLBACK = "private, max-age=120, stale-while-revalidate=600";
const isSocketAbort = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const cause = (error as any).cause;
  return (
    (error as any).name === "AbortError" ||
    (error as any).message === "terminated" ||
    (cause && typeof cause === "object" && ((cause as any).code === "UND_ERR_SOCKET"))
  );
};

export async function GET(req: NextRequest) {
  const upstreamUrl = req.nextUrl.searchParams.get("url");
  const token = req.nextUrl.searchParams.get("token") ?? undefined;

  if (!upstreamUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
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
      signal: controller.signal,
    });

    const responseHeaders = new Headers();
    for (const h of FORWARD_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }
    if (!responseHeaders.has("cache-control")) {
      responseHeaders.set("cache-control", CACHE_FALLBACK);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    if (controller.signal.aborted || isSocketAbort(error)) {
      return new NextResponse(null, { status: 499 }); // Client closed request or aborted socket
    }
    console.error("Stream proxy error", error);
    return NextResponse.json({ error: "Failed to fetch upstream" }, { status: 502 });
  } finally {
    req.signal.removeEventListener("abort", onAbort);
  }
}
