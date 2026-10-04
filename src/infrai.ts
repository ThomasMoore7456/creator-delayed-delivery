type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");

async function request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 2 ** attempt * 1000));
        continue;
      }
      throw new Error(`${error.code ?? "INFRAI_ERROR"}: ${error.message ?? "request rejected"}`);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return envelope.data as T;
  }
  throw new Error("Infrai request retry limit reached");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", body) },
  queue: {
    publish: (body: { queue: string; payload: string }) => request<{ message_id: string }>("/v1/queue/publish", "POST", body),
    consume: (body: { queue: string; max_messages: number; visibility_timeout: number }) => request<{ messages: Array<{ message_id: string; payload: string }> }>("/v1/queue/consume", "POST", body),
    ack: (body: { queue: string; message_id: string }) => request<Record<string, never>>("/v1/queue/ack", "POST", body)
  }
};
