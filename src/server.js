import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { z } from "zod"
import { incidentTriageFormat } from "./schema.js"

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3000)
const opencodeUrl = (process.env.OPENCODE_URL || "http://127.0.0.1:4096").replace(/\/$/, "")
const opencodeUsername = process.env.OPENCODE_USERNAME || "opencode"
const opencodePassword = process.env.OPENCODE_PASSWORD || ""
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173"
const defaultAgent = process.env.DEFAULT_AGENT || "plan"
const defaultProviderId = process.env.DEFAULT_PROVIDER_ID || "corp"
const defaultModelId = process.env.DEFAULT_MODEL_ID || "ops-coder"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webDistPath = path.join(__dirname, "..", "web", "dist")

app.use(cors({ origin: [allowedOrigin], credentials: false }))
app.use(express.json({ limit: "2mb" }))

function basicAuthHeader() {
  if (!opencodePassword) return null
  const token = Buffer.from(`${opencodeUsername}:${opencodePassword}`).toString("base64")
  return `Basic ${token}`
}

function parseJsonResponse(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

async function opencodeRequest(pathname, options = {}) {
  const auth = basicAuthHeader()
  const headers = {
    Accept: options.accept || "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: auth } : {}),
    ...(options.headers || {})
  }

  const response = await fetch(`${opencodeUrl}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal
  })

  if ((options.accept || "application/json") === "text/event-stream") {
    return response
  }

  const raw = await response.text()
  const data = parseJsonResponse(raw)

  if (!response.ok) {
    const error = new Error(`OpenCode request failed: ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

async function tryOpencodeRequest(pathname, options = {}) {
  try {
    return await opencodeRequest(pathname, options)
  } catch (error) {
    return { error }
  }
}

function extractAssistantText(message) {
  if (!Array.isArray(message?.parts)) return null
  const chunks = message.parts
    .map((part) => part?.text || part?.content || part?.value || "")
    .filter(Boolean)
  return chunks.length ? chunks.join("\n") : null
}

function normalizeMessage(message) {
  return {
    id: message?.info?.id || message?.id || null,
    info: message?.info || null,
    parts: message?.parts || [],
    assistantText: extractAssistantText(message),
    structuredOutput: message?.info?.structured_output || null
  }
}

const createSessionSchema = z.object({
  title: z.string().min(1).max(200).optional()
})

const promptSchema = z.object({
  prompt: z.string().min(1),
  agent: z.string().optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  structured: z.boolean().optional().default(true),
  noReply: z.boolean().optional().default(false),
  system: z.string().optional()
})

const permissionSchema = z.object({
  sessionId: z.string().optional(),
  response: z.enum(["once", "always", "reject"]),
  remember: z.boolean().optional().default(false)
})

app.get("/health", async (_req, res) => {
  try {
    const upstream = await opencodeRequest("/global/health")
    res.json({ ok: true, upstream })
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message, details: error.data || null })
  }
})

app.post("/api/session", async (req, res) => {
  try {
    const body = createSessionSchema.parse(req.body || {})
    const session = await opencodeRequest("/session", { method: "POST", body })
    res.status(201).json(session)
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.get("/api/session/:id/messages", async (req, res) => {
  try {
    const messages = await opencodeRequest(`/session/${req.params.id}/message`)
    res.json(Array.isArray(messages) ? messages.map(normalizeMessage) : messages)
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.post("/api/session/:id/message", async (req, res) => {
  try {
    const input = promptSchema.parse(req.body || {})
    const body = {
      agent: input.agent || defaultAgent,
      noReply: input.noReply,
      parts: [{ type: "text", text: input.prompt }]
    }

    if (input.providerId || input.modelId) {
      body.model = {
        providerID: input.providerId || defaultProviderId,
        modelID: input.modelId || defaultModelId
      }
    }

    if (input.system) body.system = input.system
    if (input.structured) body.format = incidentTriageFormat

    const message = await opencodeRequest(`/session/${req.params.id}/message`, {
      method: "POST",
      body
    })

    res.json(normalizeMessage(message))
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.post("/api/session/:id/prompt-async", async (req, res) => {
  try {
    const input = promptSchema.parse(req.body || {})
    const body = {
      agent: input.agent || defaultAgent,
      noReply: input.noReply,
      parts: [{ type: "text", text: input.prompt }]
    }

    if (input.providerId || input.modelId) {
      body.model = {
        providerID: input.providerId || defaultProviderId,
        modelID: input.modelId || defaultModelId
      }
    }

    if (input.system) body.system = input.system
    if (input.structured) body.format = incidentTriageFormat

    await opencodeRequest(`/session/${req.params.id}/prompt_async`, {
      method: "POST",
      body
    })

    res.status(202).json({ accepted: true })
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.get("/api/permissions", async (req, res) => {
  try {
    const response = await tryOpencodeRequest("/permission")
    if (response?.error) {
      if (response.error.status === 404) {
        res.json([])
        return
      }
      throw response.error
    }

    const sessionId = req.query.sessionId ? String(req.query.sessionId) : null
    const requests = Array.isArray(response) ? response : []
    const normalized = requests.map((item) => ({
      id: item?.id || item?.requestID || null,
      sessionId: item?.sessionID || item?.sessionId || null,
      permission: item?.permission || item?.type || "unknown",
      patterns: Array.isArray(item?.patterns) ? item.patterns : item?.pattern ? [item.pattern] : [],
      always: Array.isArray(item?.always) ? item.always : [],
      metadata: item?.metadata || {},
      tool: item?.tool || null,
      raw: item
    }))

    res.json(sessionId ? normalized.filter((item) => item.sessionId === sessionId) : normalized)
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.post("/api/permissions/:requestId/reply", async (req, res) => {
  try {
    const input = permissionSchema.parse(req.body || {})

    const primary = await tryOpencodeRequest(`/permission/${req.params.requestId}/reply`, {
      method: "POST",
      body: {
        reply: input.response,
        remember: input.remember
      }
    })

    if (!primary?.error) {
      res.json({ ok: true, upstream: "permission.reply" })
      return
    }

    if (primary.error.status !== 404 || !input.sessionId) {
      throw primary.error
    }

    const fallback = await opencodeRequest(
      `/session/${input.sessionId}/permissions/${req.params.requestId}`,
      {
        method: "POST",
        body: {
          response: input.response,
          remember: input.remember
        }
      }
    )

    res.json({ ok: fallback === true || fallback === null ? true : fallback, upstream: "session.permissions" })
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.post("/api/session/:id/permissions/:permissionId", async (req, res) => {
  try {
    const input = permissionSchema.parse({ ...(req.body || {}), sessionId: req.params.id })
    const primary = await tryOpencodeRequest(`/permission/${req.params.permissionId}/reply`, {
      method: "POST",
      body: {
        reply: input.response,
        remember: input.remember
      }
    })

    if (!primary?.error) {
      res.json({ ok: true, upstream: "permission.reply" })
      return
    }

    const fallback = await opencodeRequest(
      `/session/${req.params.id}/permissions/${req.params.permissionId}`,
      {
        method: "POST",
        body: {
          response: input.response,
          remember: input.remember
        }
      }
    )

    res.json({ ok: fallback === true || fallback === null ? true : fallback, upstream: "session.permissions" })
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message, details: error.data || null })
  }
})

app.get("/api/events", async (req, res) => {
  const controller = new AbortController()
  req.on("close", () => controller.abort())

  try {
    const upstream = await opencodeRequest("/global/event", {
      accept: "text/event-stream",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache"
      }
    })

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Failed to connect to upstream event stream" })
      return
    }

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    const reader = upstream.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    res.end()
  } catch (error) {
    if (!res.headersSent) {
      res.status(502).json({ error: error.message, details: error.data || null })
      return
    }
    res.end()
  }
})

if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath))
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(webDistPath, "index.html"))
  })
}

app.listen(port, () => {
  console.log(`BFF listening on http://localhost:${port}`)
  console.log(`OpenCode upstream: ${opencodeUrl}`)
  if (fs.existsSync(webDistPath)) {
    console.log(`Serving built web UI from ${webDistPath}`)
  }
})
