import express from "express"

const app = express()
const port = Number(process.env.MOCK_OPENCODE_PORT || 4096)
const defaultScenario = process.env.MOCK_SCENARIO || "valid"
const primaryReply404 = process.env.MOCK_PERMISSION_PRIMARY_404 === "true"

app.use(express.json({ limit: "2mb" }))

let sessionCounter = 1
let messageCounter = 1
let permissionCounter = 1

const sessions = new Map()
const permissions = new Map()
const eventClients = new Set()

function now() {
  return new Date().toISOString()
}

function createSessionState(title) {
  const id = `sess_mock_${sessionCounter++}`
  const state = {
    id,
    title,
    createdAt: now(),
    status: "active",
    messages: [],
    pendingPermissionIds: []
  }
  sessions.set(id, state)
  return state
}

function createUserMessage(prompt) {
  return {
    id: `msg_mock_${messageCounter++}`,
    info: {
      id: `msg_mock_${messageCounter++}`,
      role: "user",
      time: {
        created: now(),
        completed: now()
      }
    },
    parts: [{ type: "text", text: prompt }]
  }
}

function createAssistantMessage({ assistantText, structuredOutput }) {
  const timestamp = now()
  return {
    id: `msg_mock_${messageCounter++}`,
    info: {
      id: `msg_mock_${messageCounter++}`,
      role: "assistant",
      time: {
        created: timestamp,
        completed: timestamp
      },
      structured_output: structuredOutput || null
    },
    parts: assistantText ? [{ type: "text", text: assistantText }] : []
  }
}

function validStructuredOutput() {
  return {
    summary: "Mock checkout incident after deploy. Evidence points to a release regression but the cause is not fully confirmed.",
    severity: "sev1",
    confidence: 0.81,
    user_impact: "일부 checkout 요청이 실패하고 결제가 완료되지 않는다.",
    blast_radius: ["checkout-web", "payments-api", "ap-northeast-2"],
    evidence: [
      "배포 직후 502 비율이 증가했다.",
      "결제 API 지연이 같은 시각에 상승했다.",
      "서울 리전에 트래픽 영향이 집중되어 있다."
    ],
    hypotheses: [
      {
        rank: 1,
        title: "recent deploy introduced a payments regression",
        confidence: 0.81,
        why: "오류 상승 시점이 배포 직후와 일치하고 관련 서비스 지표가 함께 악화됐다.",
        confirm_by: ["rollback compare", "check payment error logs"]
      }
    ],
    recommended_actions: ["pause rollout", "compare rollback metrics", "inspect payment dependency errors"],
    escalate_now: true,
    open_questions: ["다른 리전에서도 같은 오류가 발생하는가?"]
  }
}

function invalidStructuredOutput() {
  return {
    severity: "sev2",
    confidence: 0.41,
    user_impact: "응답 지연이 증가했다.",
    blast_radius: ["worker"],
    evidence: ["queue backlog가 증가했다."],
    hypotheses: [],
    recommended_actions: ["check queue consumers"],
    escalate_now: false
  }
}

function assistantFixtureForScenario(scenario, wantsStructured) {
  if (scenario === "invalid-structured") {
    return {
      assistantText: "Structured output is incomplete. Use fallback text while inspecting the raw payload.",
      structuredOutput: wantsStructured ? invalidStructuredOutput() : null
    }
  }

  if (scenario === "text-only") {
    return {
      assistantText: "Mock assistant text only response. Structured output was intentionally omitted.",
      structuredOutput: null
    }
  }

  return {
    assistantText: "Mock structured triage generated successfully.",
    structuredOutput: wantsStructured ? validStructuredOutput() : null
  }
}

function detectScenario(req, sessionState) {
  const prompt = req.body?.parts?.[0]?.text || ""
  const bodyScenario = req.body?.metadata?.scenario
  const match = typeof prompt === "string" ? prompt.match(/\[mock:([a-z-]+)\]/i) : null
  return (
    bodyScenario ||
    (match ? match[1].toLowerCase() : null) ||
    sessionState?.scenario ||
    defaultScenario
  )
}

function broadcastEvent(eventName, properties) {
  const payload = JSON.stringify({
    type: eventName,
    properties: {
      ...properties,
      ts: properties?.ts || now()
    }
  })

  for (const client of eventClients) {
    client.write(`event: ${eventName}\n`)
    client.write(`data: ${payload}\n\n`)
  }
}

function trackSessionMessage(sessionState, message) {
  sessionState.messages.push(message)
  return message
}

function createPermission(sessionState, scenario) {
  const id = primaryReply404 ? `perm_fallback_${permissionCounter++}` : `perm_mock_${permissionCounter++}`
  const request = {
    id,
    requestID: id,
    sessionID: sessionState.id,
    permission: scenario === "permission" ? "bash" : "read",
    patterns: scenario === "permission" ? ["grep *", "git diff*"] : ["README.md"],
    always: scenario === "permission" ? ["grep *"] : [],
    metadata: {
      source: "fake-opencode",
      scenario,
      note: "Mock permission request for local home testing."
    },
    tool: scenario === "permission" ? "bash" : "read"
  }
  permissions.set(id, request)
  sessionState.pendingPermissionIds.push(id)
  return request
}

function clearPermissionFromSession(sessionState, permissionId) {
  sessionState.pendingPermissionIds = sessionState.pendingPermissionIds.filter((id) => id !== permissionId)
}

function findSession(id) {
  const sessionState = sessions.get(id)
  if (!sessionState) return null
  return sessionState
}

app.get("/global/health", (_req, res) => {
  res.json({ version: "mock-0.1", ok: true })
})

app.post("/session", (req, res) => {
  const sessionState = createSessionState(req.body?.title || "mock incident")
  res.status(201).json({
    id: sessionState.id,
    title: sessionState.title
  })
})

app.get("/session/:id/message", (req, res) => {
  const sessionState = findSession(req.params.id)
  if (!sessionState) {
    res.status(404).json({ error: "session not found" })
    return
  }
  res.json(sessionState.messages)
})

app.post("/session/:id/message", (req, res) => {
  const sessionState = findSession(req.params.id)
  if (!sessionState) {
    res.status(404).json({ error: "session not found" })
    return
  }

  const prompt = req.body?.parts?.[0]?.text || ""
  const scenario = detectScenario(req, sessionState)
  sessionState.scenario = scenario
  trackSessionMessage(sessionState, createUserMessage(prompt))

  if (scenario === "permission") {
    const permission = createPermission(sessionState, scenario)
    broadcastEvent("permission.asked", permission)
  }

  const fixture = assistantFixtureForScenario(scenario, Boolean(req.body?.format))
  const assistant = trackSessionMessage(sessionState, createAssistantMessage(fixture))
  res.json(assistant)
})

app.post("/session/:id/prompt_async", (req, res) => {
  const sessionState = findSession(req.params.id)
  if (!sessionState) {
    res.status(404).json({ error: "session not found" })
    return
  }

  const prompt = req.body?.parts?.[0]?.text || ""
  const scenario = detectScenario(req, sessionState)
  sessionState.scenario = scenario
  trackSessionMessage(sessionState, createUserMessage(prompt))

  setTimeout(() => {
    if (scenario === "permission") {
      const permission = createPermission(sessionState, scenario)
      broadcastEvent("permission.asked", permission)
      return
    }

    const fixture = assistantFixtureForScenario(scenario, Boolean(req.body?.format))
    const assistant = trackSessionMessage(sessionState, createAssistantMessage(fixture))
    broadcastEvent("message.updated", {
      sessionID: sessionState.id,
      messageID: assistant.info.id,
      role: "assistant"
    })
    broadcastEvent("session.idle", {
      sessionID: sessionState.id,
      status: "idle"
    })
  }, 350)

  res.status(202).json({ accepted: true })
})

app.get("/permission", (_req, res) => {
  res.json(Array.from(permissions.values()))
})

app.post("/permission/:requestId/reply", (req, res) => {
  if (primaryReply404 && req.params.requestId.startsWith("perm_fallback_")) {
    res.status(404).json({ error: "force fallback path" })
    return
  }

  const permission = permissions.get(req.params.requestId)
  if (!permission) {
    res.status(404).json({ error: "permission not found" })
    return
  }

  permissions.delete(req.params.requestId)
  const sessionState = sessions.get(permission.sessionID)
  if (sessionState) clearPermissionFromSession(sessionState, req.params.requestId)

  broadcastEvent("permission.replied", {
    sessionID: permission.sessionID,
    requestID: req.params.requestId,
    reply: req.body?.reply || "once"
  })

  if (sessionState) {
    const assistant = trackSessionMessage(
      sessionState,
      createAssistantMessage({
        assistantText: `Permission reply ${req.body?.reply || "once"} accepted by fake-opencode.`,
        structuredOutput: validStructuredOutput()
      })
    )
    broadcastEvent("message.updated", {
      sessionID: sessionState.id,
      messageID: assistant.info.id,
      role: "assistant"
    })
    broadcastEvent("session.idle", {
      sessionID: sessionState.id,
      status: "idle"
    })
  }

  res.json({ ok: true, upstream: "fake.permission.reply" })
})

app.post("/session/:sessionId/permissions/:permissionId", (req, res) => {
  const permission = permissions.get(req.params.permissionId)
  if (!permission) {
    res.status(404).json({ error: "permission not found" })
    return
  }

  permissions.delete(req.params.permissionId)
  const sessionState = sessions.get(req.params.sessionId)
  if (sessionState) clearPermissionFromSession(sessionState, req.params.permissionId)

  broadcastEvent("permission.replied", {
    sessionID: req.params.sessionId,
    requestID: req.params.permissionId,
    reply: req.body?.response || "once"
  })

  res.json(true)
})

app.get("/global/event", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  res.write(`event: connected\n`)
  res.write(`data: ${JSON.stringify({ type: "connected", properties: { ts: now() } })}\n\n`)

  eventClients.add(res)

  req.on("close", () => {
    eventClients.delete(res)
    res.end()
  })
})

app.listen(port, () => {
  console.log(`fake-opencode listening on http://127.0.0.1:${port}`)
  console.log(`default scenario: ${defaultScenario}`)
  console.log(`primary reply 404 fallback mode: ${primaryReply404}`)
})
