type JsonSchema = Record<string, unknown>;

export async function structured<T>(opts: {
  model?: string;
  system: string;
  user: string;
  schema: JsonSchema;
  name: string;
  fallback: T;
  validate: (value: unknown) => T | null;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return opts.fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model:
          opts.model ??
          process.env.OPENAI_REASON_MODEL ??
          "gpt-5.5",
        input: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: opts.name,
            strict: true,
            schema: opts.schema,
          },
        },
      }),
    });

    if (!response.ok) return opts.fallback;
    const data = await response.json();
    const parsed = parseStructuredResponse(data);
    return opts.validate(parsed) ?? opts.fallback;
  } catch {
    return opts.fallback;
  }
}

function parseStructuredResponse(data: any): unknown {
  if (typeof data?.output_text === "string") {
    return JSON.parse(data.output_text);
  }

  const text = data?.output
    ?.flatMap((item: any) => item?.content ?? [])
    ?.find((content: any) => content?.type === "output_text")?.text;
  if (typeof text === "string") return JSON.parse(text);

  return null;
}
