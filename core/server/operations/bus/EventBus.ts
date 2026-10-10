

import { EventEmitter } from 'node:events'

export interface DomainEvent<T = unknown> {
  
  id: string
  
  name: string
  
  timestamp: string
  
  payload: T
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void

const EVENTBUS_HANDLER_TIMEOUT_MS = 10_000

class EventBusTimeoutMarker extends Error {}

function withEventBusTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  promise.catch(() => {})
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      onTimeout()
      reject(new EventBusTimeoutMarker())
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

class EventBus {
  private emitter = new EventEmitter()

  constructor() {
    
    this.emitter.setMaxListeners(50)
  }

  

  publish<T>(event: DomainEvent<T>): void {
    const handlers = this.emitter.listeners(event.name) as EventHandler<T>[]
    
    void (async () => {
      for (const handler of handlers) {
        const handlerName = handler.name || 'anonymous'
        try {
          await withEventBusTimeout(
            Promise.resolve(handler(event)),
            EVENTBUS_HANDLER_TIMEOUT_MS,
            () => {
              console.error(
                `[EventBus] handler '${handlerName}' TIMEOUT >${EVENTBUS_HANDLER_TIMEOUT_MS}ms — abandoned, chain continues`,
              )
            },
          )
        } catch (err: any) {
          if (err instanceof EventBusTimeoutMarker) continue 
          console.error(`[EventBus] Handler error on '${event.name}':`, err?.message || err)
          
        }
      }
    })()
  }

  

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    this.emitter.on(eventName, handler as EventHandler)
    console.log(`[EventBus] Handler registered for '${eventName}'`)
  }

  

  listenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName)
  }
}

export const eventBus = new EventBus()

;(globalThis as any).eventBus = eventBus
