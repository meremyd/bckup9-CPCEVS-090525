import { fetchWithAuth } from "../../../logics/api"

export async function getUsers() {
  return fetchWithAuth("/users")
}
