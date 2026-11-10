import { headers } from "next/headers";

// Only a plain host name (or an IP literal) with an optional port is accepted,
// so a malformed Host header can never add a path, credentials or a second host.
const HOST_PATTERN =
  /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:]+\])(?::\d{1,5})?$/i;

// The origin this request was made to, for the server's own API calls:
// "http://localhost:3000" locally, "https://<your-domain>" on Vercel.
export async function getOrigin(): Promise<string> {
  const requestHeaders = await headers();

  const host = requestHeaders.get("host");
  if (!host || !HOST_PATTERN.test(host)) {
    throw new Error("Cannot determine the host of this request.");
  }

  // Vercel (a proxy) sends "x-forwarded-proto: https". Locally there is no
  // proxy and no such header, so the request was plain http.
  const forwarded = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim()
    .toLowerCase();
  const protocol = forwarded === "https" ? "https" : "http";

  return `${protocol}://${host}`;
}
