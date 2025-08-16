import { inject, provide } from 'vue'

export function useCreateContext<T>(injectionKey: string) {
  const injectContext = () => {
    const ctx = inject(injectionKey)
    if (!ctx) {
      throw new Error(
        `Context with key "${injectionKey}" not found. Make sure to provide it before injecting.`,
      )
    }
    return ctx as T
  }

  const provideContext = (contextValue: T) => {
    provide(injectionKey, contextValue)
    return contextValue
  }

  return [injectContext, provideContext] as const
}
