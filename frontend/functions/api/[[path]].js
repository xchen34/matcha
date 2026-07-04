function buildTargetUrl(requestUrl, apiBaseUrl) {
  const incomingUrl = new URL(requestUrl);
  const targetBase = apiBaseUrl.replace(/\/+$/, "");
  return `${targetBase}${incomingUrl.pathname}${incomingUrl.search}`;
}

function copyHeaders(headers, apiBaseUrl) {
  const nextHeaders = new Headers(headers);
  const apiOrigin = new URL(apiBaseUrl).origin;

  nextHeaders.set("x-forwarded-host", headers.get("host") || "");
  nextHeaders.set("x-forwarded-proto", "https");
  nextHeaders.set("origin", apiOrigin);
  nextHeaders.set("host", new URL(apiBaseUrl).host);

  return nextHeaders;
}

export async function onRequest(context) {
  const { request, env } = context;
  const apiBaseUrl = env.API_BASE_URL;

  if (!apiBaseUrl) {
    return Response.json(
      {
        error:
          "Missing Cloudflare Pages environment variable: API_BASE_URL",
      },
      { status: 500 },
    );
  }

  const init = {
    method: request.method,
    headers: copyHeaders(request.headers, apiBaseUrl),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(
    buildTargetUrl(request.url, apiBaseUrl),
    init,
  );

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
