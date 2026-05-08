import localforage from 'localforage'

export interface Profile {
  apiEndpoint: string
  orderNo: string
  recordingNo: number
  locationCode: string
  bearerToken?: string
}

const profileStore = localforage.createInstance({ name: 'inventory', storeName: 'settings' })

export function useProfile() {
  const profile = useState<Profile | null>('profile', () => null)
  const loaded = useState<boolean>('profileLoaded', () => false)

  async function loadProfile() {
    const p = await profileStore.getItem<Profile>('profile')
    profile.value = p ?? null
    loaded.value = true
  }

  async function saveProfile(data: Profile) {
    await profileStore.setItem('profile', data)
    profile.value = data
  }

  async function clearProfile() {
    await profileStore.removeItem('profile')
    profile.value = null
  }

  function sanitizeEndpoint(input: string): string {
    let s = input.trim()
    if (s.startsWith('<') && s.endsWith('>')) s = s.substring(1, s.length - 1)
    return s
  }

  return { profile, loaded, loadProfile, saveProfile, clearProfile, sanitizeEndpoint }
}