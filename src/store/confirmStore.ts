import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

interface ConfirmState {
  request: ConfirmRequest | null
  ask: (options: ConfirmOptions) => Promise<boolean>
  close: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      set({ request: { ...options, resolve } })
    }),
  close: (ok) => {
    const current = get().request
    if (!current) return
    set({ request: null })
    current.resolve(ok)
  },
}))

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options)
}
