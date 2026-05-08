import localforage from 'localforage'
import { uuidv4 } from '~/utils/uuid'

export interface OutboxPayload {
  orderNo: string
  recordingNo: number
  locationCode: string
  packageNo: string
  quantity: number
  packageIntact: boolean
}

export interface OutboxEntry {
  id: string
  url: string
  headers: Record<string, string>
  payload: OutboxPayload
  ts: string
}

const outboxStore = localforage.createInstance({ name: 'inventory', storeName: 'outbox' })

export function useOutbox() {
  const entries = useState<OutboxEntry[]>('outbox', () => [])

  async function loadOutbox() {
    const items = await outboxStore.getItem<OutboxEntry[]>('entries')
    entries.value = items ?? []
  }

  async function addEntry(entry: Omit<OutboxEntry, 'id' | 'ts'>) {
    const newEntry: OutboxEntry = {
      ...entry,
      id: uuidv4(),
      ts: new Date().toISOString(),
    }
    const updated = [...entries.value, newEntry]
    await outboxStore.setItem('entries', updated)
    entries.value = updated
    return newEntry
  }

  async function removeEntry(id: string) {
    const updated = entries.value.filter(e => e.id !== id)
    await outboxStore.setItem('entries', updated)
    entries.value = updated
  }

  async function clearOutbox() {
    await outboxStore.setItem('entries', [])
    entries.value = []
  }

  async function syncOutbox(bearerToken?: string): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 }
    for (const entry of entries.value) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ms-client-tracking-id': uuidv4(),
          ...entry.headers,
        }
        if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

        const resp = await fetch(entry.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(entry.payload),
        })
        if (resp.ok) {
          await removeEntry(entry.id)
          results.success++
        } else {
          results.failed++
        }
      } catch {
        results.failed++
      }
    }
    return results
  }

  return { entries, loadOutbox, addEntry, removeEntry, clearOutbox, syncOutbox }
}