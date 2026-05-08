import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/rpc/route";

describe("POST /api/rpc", () => {
  const originalRpc = process.env.RPC_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.RPC_URL;
  });

  afterEach(() => {
    if (originalRpc === undefined) delete process.env.RPC_URL;
    else process.env.RPC_URL = originalRpc;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a 503 JSON-RPC error when RPC_URL is not set", async () => {
    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
      }),
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = await res.json();
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32000 },
    });
    expect(body.error.message).toMatch(/RPC_URL is not configured/i);
  });

  it("forwards the request body to the upstream RPC and returns its response", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const upstreamBody = '{"jsonrpc":"2.0","id":1,"result":"0x1"}';
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(upstreamBody, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    globalThis.fetch = fetchSpy;

    const reqBody = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}';
    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: reqBody,
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.text()).toBe(upstreamBody);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://rpc.example.test/key");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(init?.body).toBe(reqBody);
  });

  it("propagates upstream non-2xx status codes", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    globalThis.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("rate limited", {
          status: 429,
          headers: { "content-type": "text/plain" },
        }),
      );

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toBe("text/plain");
  });

  it("rejects bodies larger than the size cap", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const fetchSpy = vi.fn<typeof fetch>();
    globalThis.fetch = fetchSpy;

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: "x".repeat(64 * 1024 + 1),
      }),
    );
    expect(res.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unparseable JSON", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const fetchSpy = vi.fn<typeof fetch>();
    globalThis.fetch = fetchSpy;

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe(-32700);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects methods that are not on the read-only allow-list", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const fetchSpy = vi.fn<typeof fetch>();
    globalThis.fetch = fetchSpy;

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "eth_sendRawTransaction",
          params: ["0xdeadbeef"],
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.id).toBe(7);
    expect(body.error.message).toMatch(/eth_sendRawTransaction/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a batch if any call uses a disallowed method", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const fetchSpy = vi.fn<typeof fetch>();
    globalThis.fetch = fetchSpy;

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "eth_chainId" },
          { jsonrpc: "2.0", id: 2, method: "eth_sendTransaction" },
        ]),
      }),
    );
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid batch of allow-listed calls", async () => {
    process.env.RPC_URL = "https://rpc.example.test/key";
    const upstreamBody = "[]";
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(upstreamBody, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    globalThis.fetch = fetchSpy;

    const res = await POST(
      new Request("http://localhost/api/rpc", {
        method: "POST",
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "eth_chainId" },
          { jsonrpc: "2.0", id: 2, method: "eth_blockNumber" },
        ]),
      }),
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
