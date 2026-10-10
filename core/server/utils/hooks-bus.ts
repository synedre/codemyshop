

import { CRITICAL_HOOKS } from './hooks-catalog'

type ActionHandler<T = any> = (ctx: T) => Promise<void> | void
type FilterHandler<T = any> = (value: T, ctx?: any) => Promise<T> | T

interface RegisteredHandler<H> {
  handler: H
  priority: number
}

const FILTER_TIMEOUT_MS = 800   
const ACTION_TIMEOUT_MS = 5000  

const FILTER_MAX_HANDLERS = 5
const ACTION_MAX_HANDLERS = 20

const actionRegistry = new Map<string, RegisteredHandler<ActionHandler>[]>()
const filterRegistry = new Map<string, RegisteredHandler<FilterHandler>[]>()

class HookTimeoutMarker extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  promise.catch(() => {})
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      onTimeout()
      reject(new HookTimeoutMarker())
    }, ms)
    promise.then(
      (v) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

let criticalHookFailureCount = 0

function hookLogPrefix(name: string): string {
  if (CRITICAL_HOOKS.has(name)) {
    criticalHookFailureCount++
    return '[hooks:CRITICAL]'
  }
  return '[hooks]'
}

export function getCriticalHookFailureCount(): number {
  return criticalHookFailureCount
}

function register<H>(
  registry: Map<string, RegisteredHandler<H>[]>,
  name: string,
  handler: H,
  priority: number,
  cap: number,
): void {
  if (!registry.has(name)) registry.set(name, [])
  const list = registry.get(name)!
  
  
  if (list.some((r) => r.handler === handler)) return
  
  
  if (list.length >= cap) {
    console.error(`[hooks] hook "${name}" at max handlers (${cap}) — registration refused, handler ignored`)
    return
  }
  list.push({ handler, priority })
  list.sort((a, b) => a.priority - b.priority)
}

export function onAction<T = any>(name: string, handler: ActionHandler<T>, priority = 100): void {
  register(actionRegistry, name, handler as ActionHandler, priority, ACTION_MAX_HANDLERS)
}

export async function callAction<T = any>(name: string, ctx: T): Promise<void> {
  const handlers = actionRegistry.get(name)
  if (!handlers || handlers.length === 0) return
  await Promise.allSettled(
    handlers.map(async ({ handler }) => {
      try {
        await withTimeout(
          Promise.resolve(handler(ctx)),
          ACTION_TIMEOUT_MS,
          () => {
            const prefix = hookLogPrefix(name)
            console.error(`${prefix} action "${name}" handler TIMEOUT >${ACTION_TIMEOUT_MS}ms — abandoned`)
          },
        )
      } catch (err: any) {
        if (err instanceof HookTimeoutMarker) return 
        const prefix = hookLogPrefix(name)
        console.error(`${prefix} action '${name}' handler failed:`, err?.message)
      }
    })
  )
}

export function onFilter<T = any>(name: string, handler: FilterHandler<T>, priority = 100): void {
  register(filterRegistry, name, handler as FilterHandler, priority, FILTER_MAX_HANDLERS)
}

export async function applyFilter<T = any>(name: string, value: T, ctx?: any): Promise<T> {
  const handlers = filterRegistry.get(name)
  if (!handlers || handlers.length === 0) return value
  let current = value
  for (const { handler } of handlers) {
    try {
      current = await withTimeout(
        Promise.resolve(handler(current, ctx)),
        FILTER_TIMEOUT_MS,
        () => {
          const prefix = hookLogPrefix(name)
          console.error(`${prefix} filter "${name}" handler TIMEOUT >${FILTER_TIMEOUT_MS}ms — value unchanged, skipped`)
        },
      )
    } catch (err: any) {
      if (err instanceof HookTimeoutMarker) continue 
      const prefix = hookLogPrefix(name)
      console.error(`${prefix} filter '${name}' handler failed:`, err?.message)
    }
  }
  return current
}

export function listRegisteredHooks(): { actions: string[], filters: string[] } {
  return {
    actions: Array.from(actionRegistry.keys()).sort(),
    filters: Array.from(filterRegistry.keys()).sort(),
  }
}
