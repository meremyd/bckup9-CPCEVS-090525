import api from "./api"

export const authQueries = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials)
    return response.data
  },
  voterLogin: async (credentials) => {
    const response = await api.post("/auth/voter-login", credentials)
    return response.data
  },
  preRegisterStep1: async (data) => {
    const response = await api.post("/auth/pre-register-step1", data)
    return response.data
  },
  preRegisterStep2: async (data) => {
    const response = await api.post("/auth/pre-register-step2", data)
    return response.data
  },
}

export const userQueries = {
  getUsers: async () => {
    const response = await api.get("/users")
    return response.data
  },
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },
}

export const voterQueries = {
  getVoters: async () => {
    const response = await api.get("/voters")
    return response.data
  },
}

export const electionQueries = {
  getElections: async () => {
    const response = await api.get("/elections")
    return response.data
  },
  getElection: async (id) => {
    const response = await api.get(`/elections/${id}`)
    return response.data
  },
}

export const chatSupportQueries = {
  submitSupport: async (data) => {
    const response = await api.post("/chat-support", data)
    return response.data
  },
}
