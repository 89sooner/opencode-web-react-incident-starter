const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")

function resolve(path) {
  return `${baseUrl}${path}`
}

async function readJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function request(path, options = {}) {
  const response = await fetch(resolve(path), {
    method: options.method || "GET",
    headers: {
      Accept: options.accept || "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal
  })

  const data = await readJson(response)
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed: ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  resolve,
  getHealth() {
    return request("/health")
  },
  createSession(title) {
    return request("/api/session", {
      method: "POST",
      body: title ? { title } : {}
    })
  },
  getMessages(sessionId) {
    return request(`/api/session/${sessionId}/messages`)
  },
  sendMessage(sessionId, payload) {
    return request(`/api/session/${sessionId}/message`, {
      method: "POST",
      body: payload
    })
  },
  sendPromptAsync(sessionId, payload) {
    return request(`/api/session/${sessionId}/prompt-async`, {
      method: "POST",
      body: payload
    })
  },
  getPendingPermissions(sessionId) {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""
    return request(`/api/permissions${query}`)
  },
  replyToPermission(requestId, payload) {
    return request(`/api/permissions/${requestId}/reply`, {
      method: "POST",
      body: payload
    })
  }
}
