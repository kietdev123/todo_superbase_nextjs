export type HealthStatus = {
  status: "ok";
  service: "web_admin";
  timestamp: string;
};

export function createHealthPayload(): HealthStatus {
  return {
    status: "ok",
    service: "web_admin",
    timestamp: new Date().toISOString(),
  };
}

export async function getHealthStatus(signal?: AbortSignal) {
  const response = await fetch("/health", {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health API trả về HTTP ${response.status}.`);
  }

  return (await response.json()) as HealthStatus;
}
