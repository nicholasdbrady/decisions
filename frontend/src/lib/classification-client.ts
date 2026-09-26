import {
  classificationRequestSchema,
  classificationResultSchema,
  type ClassificationRequest,
  type ClassificationResult,
} from "@/lib/contracts";

type ClassifyOptions = {
  baseUrl?: string;
  signal?: AbortSignal;
};

export async function classifyText(
  input: ClassificationRequest,
  options: ClassifyOptions = {},
): Promise<ClassificationResult> {
  const payload = classificationRequestSchema.parse(input);
  const baseUrl = options.baseUrl ?? "http://127.0.0.1:8000";
  const response = await fetch(`${baseUrl}/api/classify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(`Classification failed (${response.status}): ${detail}`);
  }

  return classificationResultSchema.parse(await response.json());
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
    ) {
      return payload.detail;
    }
  } catch {
    return response.statusText || "Unknown error";
  }

  return response.statusText || "Unknown error";
}
