

import { firstTextBlock } from '../../utils/llm-response-block'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export interface AnthropicCallOptions {
  apiKey: string
  model?: string
  systemPrompt?: string
  userPrompt: string
  

  userBlocks?: Record<string, unknown>[]
  maxTokens?: number
  temperature?: number
  timeout?: number
  

  outputConfig?: Record<string, unknown>
}

export interface AnthropicCallResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  
  stopReason: string | null
}

export async function callAnthropicRaw(opts: AnthropicCallOptions): Promise<AnthropicCallResult> {
  const model = opts.model ?? 'claude-sonnet-4-6'

  const response = await $fetch<any>(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.systemPrompt ?? undefined,
      messages: [{
        role: 'user',
        content: opts.userBlocks?.length ? [...opts.userBlocks, { type: 'text', text: opts.userPrompt }] : opts.userPrompt,
      }],
      temperature: opts.temperature ?? undefined,
      output_config: opts.outputConfig ?? undefined,
    },
    timeout: opts.timeout ?? 120000,
  })

  return {
    
    
    content: firstTextBlock(response.content),
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    model,
    stopReason: response.stop_reason ?? null,
  }
}
