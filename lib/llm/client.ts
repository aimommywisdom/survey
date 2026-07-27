// Provider-agnostic LLM 呼叫（OpenAI / Anthropic），用 fetch，不裝 SDK（Workers 友善）。
import 'server-only';

export type Provider = 'openai' | 'anthropic';

export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5-20250929',
};

export async function callLLM(opts: {
  provider: Provider;
  apiKey: string;
  model?: string;
  system: string;
  user: string;
}): Promise<string> {
  const { provider, apiKey, system, user } = opts;
  const model = opts.model || DEFAULT_MODEL[provider];

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `OpenAI 錯誤（${res.status}）`);
    }
    return data.choices?.[0]?.message?.content ?? '';
  }

  // anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Anthropic 錯誤（${res.status}）`);
  }
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');
}
