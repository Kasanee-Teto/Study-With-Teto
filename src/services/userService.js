import { postJSON } from '../lib/api'

export async function getOrCreateAppUser() {
  const data = await postJSON('/api/user/upsert')
  return data.appUser
}
