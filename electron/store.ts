import StoreImport from 'electron-store'

type StoreCtor = new (options: { name: string }) => {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
}

const Ctor = (
  typeof StoreImport === 'function' ? StoreImport : (StoreImport as unknown as { default: StoreCtor }).default
) as StoreCtor

const store = new Ctor({ name: 'kip' })

export function storeGet(key: string): unknown {
  return store.get(key)
}

export function storeSet(key: string, value: unknown): void {
  store.set(key, value)
}

export function storeDelete(key: string): void {
  store.delete(key)
}
