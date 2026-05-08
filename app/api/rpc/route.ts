export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

// Read-only JSON-RPC methods this proxy will forward. Anything else (notably
// eth_sendTransaction / eth_sendRawTransaction) is rejected — writes go
// directly from the user's wallet, never through the server.
const ALLOWED_METHODS = new Set<string>([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
  "net_version",
  "web3_clientVersion",
]);

function rpcError(
  status: number,
  code: number,
  message: string,
  id: number | string | null = null,
) {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status },
  );
}

type JsonRpcCall = { id?: number | string | null; method?: unknown };

function reasonIfDisallowed(payload: unknown): string | null {
  const calls: JsonRpcCall[] = Array.isArray(payload)
    ? (payload as JsonRpcCall[])
    : [payload as JsonRpcCall];
  for (const call of calls) {
    if (!call || typeof call !== "object") return "malformed JSON-RPC call";
    const method = (call as JsonRpcCall).method;
    if (typeof method !== "string") return "missing method";
    if (!ALLOWED_METHODS.has(method)) return `method not allowed: ${method}`;
  }
  return null;
}

export async function POST(req: Request) {
  const url = process.env.RPC_URL;
  if (!url) {
    return rpcError(
      503,
      -32000,
      "RPC_URL is not configured on the server. See /docs for setup.",
    );
  }

  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    return rpcError(413, -32600, "request body too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return rpcError(400, -32700, "parse error");
  }

  const reason = reasonIfDisallowed(parsed);
  if (reason) {
    const id =
      !Array.isArray(parsed) &&
      parsed &&
      typeof parsed === "object" &&
      "id" in parsed
        ? ((parsed as { id?: number | string | null }).id ?? null)
        : null;
    return rpcError(403, -32601, reason, id);
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  const contentType =
    upstream.headers.get("content-type") ?? "application/json";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });
}
