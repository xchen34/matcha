function buildTargetUrl(requestUrl, apiBaseUrl) {
  const incomingUrl = new URL(requestUrl);
  const targetBase = apiBaseUrl.replace(/\/+$/, "");
  return `${targetBase}${incomingUrl.pathname}${incomingUrl.search}`;
}

function copyHeaders(headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("host");

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
    headers: copyHeaders(request.headers),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const upstreamResponse = await fetch(
      buildTargetUrl(request.url, apiBaseUrl),
      init,
    );

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Pages API proxy failed",
        details: String(error?.message || error),
      },
      { status: 502 },
    );
  }
}
