import React, { useEffect, useMemo, useRef, useState } from "react"
import { api } from "./api.js"
import { subscribeToEventStream } from "./sse.js"

const h = React.createElement
const MAX_EVENT_LOG = 120

function classNames(...values) {
  return values.filter(Boolean).join(" ")
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function truncate(value, size = 140) {
  if (!value) return ""
  return value.length > size ? `${value.slice(0, size)}…` : value
}

function toneForSeverity(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "sev0":
      return "danger"
    case "sev1":
      return "warning"
    case "sev2":
      return "caution"
    default:
      return "muted"
  }
}

function normalizeEventFrame(frame) {
  const envelope = frame?.data && typeof frame.data === "object" ? frame.data : null
  const type =
    (frame?.event && frame.event !== "message" ? frame.event : null) ||
    envelope?.type ||
    envelope?.event ||
    "message"
  const payload = envelope?.properties && typeof envelope.properties === "object" ? envelope.properties : envelope || {}
  const sessionId =
    payload?.sessionID ||
    payload?.sessionId ||
    payload?.session?.id ||
    payload?.session?.sessionID ||
    null

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    type,
    payload,
    sessionId,
    raw: frame?.raw || ""
  }
}

function extractPermissionRequest(entry) {
  if (!entry) return null
  const payload = entry.payload || {}
  const permissionType = payload.permission || payload.type || payload.title || null
  const requestId = payload.id || payload.requestID || payload.requestId || payload.permissionID || null
  const sessionId = entry.sessionId || payload.sessionID || payload.sessionId || null
  const patterns = Array.isArray(payload.patterns)
    ? payload.patterns
    : payload.pattern
      ? [payload.pattern]
      : []
  const always = Array.isArray(payload.always) ? payload.always : []
  const isPermissionEvent =
    entry.type === "permission.asked" ||
    entry.type === "permission.updated" ||
    (Boolean(requestId) && Boolean(permissionType) && Boolean(sessionId))

  if (!isPermissionEvent || !requestId || !sessionId) return null

  return {
    id: requestId,
    sessionId,
    permission: permissionType,
    patterns,
    always,
    metadata: payload.metadata || {},
    message: payload.message || payload.metadata?.message || null,
    raw: payload
  }
}

function shouldRefreshForEvent(entry, activeSessionId) {
  if (!activeSessionId) return false
  if (entry.sessionId && entry.sessionId !== activeSessionId) return false

  return [
    "message.updated",
    "message.part.updated",
    "message.part.removed",
    "message.removed",
    "session.updated",
    "session.idle",
    "session.error",
    "permission.replied",
    "permission.asked",
    "permission.updated"
  ].includes(entry.type)
}

function inferTitle(prompt) {
  const compact = String(prompt || "").replace(/\s+/g, " ").trim()
  if (!compact) return "incident triage"
  return compact.slice(0, 48)
}

function formatTimestamp(value) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString()
}

function getLatestAssistantMessage(messages) {
  return [...messages].reverse().find((item) => item?.assistantText || item?.structuredOutput) || null
}

function SectionCard({ title, subtitle, actions, children }) {
  return h("section", { className: "card" }, [
    h("div", { className: "card-header", key: "header" }, [
      h("div", { className: "card-heading", key: "heading" }, [
        h("h2", { key: "title" }, title),
        subtitle ? h("p", { key: "subtitle", className: "card-subtitle" }, subtitle) : null
      ]),
      actions ? h("div", { key: "actions", className: "card-actions" }, actions) : null
    ]),
    h("div", { className: "card-body", key: "body" }, children)
  ])
}

function KeyValue({ label, value }) {
  return h("div", { className: "kv" }, [
    h("span", { className: "kv-label", key: "label" }, label),
    h("span", { className: "kv-value", key: "value" }, value)
  ])
}

function Badge({ label, tone = "muted" }) {
  return h("span", { className: classNames("badge", `badge-${tone}`) }, label)
}

function ListBlock({ title, items }) {
  return h("div", { className: "list-block" }, [
    h("h3", { key: "title" }, title),
    items.length
      ? h(
          "ul",
          { key: "list" },
          items.map((item, index) => h("li", { key: `${title}-${index}` }, item))
        )
      : h("p", { key: "empty", className: "muted" }, "없음")
  ])
}

function HypothesesTable({ items }) {
  if (!items.length) {
    return h("div", { className: "list-block" }, [
      h("h3", { key: "title" }, "Ranked hypotheses"),
      h("p", { key: "empty", className: "muted" }, "아직 없음")
    ])
  }

  return h("div", { className: "list-block" }, [
    h("h3", { key: "title" }, "Ranked hypotheses"),
    h(
      "div",
      { key: "table", className: "hypothesis-grid" },
      items.map((item, index) =>
        h("div", { key: `hypothesis-${index}`, className: "hypothesis-card" }, [
          h("div", { className: "hypothesis-top", key: "top" }, [
            h("strong", { key: "title" }, `${item.rank ?? index + 1}. ${item.title || "Untitled"}`),
            h(Badge, {
              key: "confidence",
              label: `confidence ${(Number(item.confidence || 0) * 100).toFixed(0)}%`,
              tone: Number(item.confidence || 0) >= 0.7 ? "good" : "caution"
            })
          ]),
          h("p", { key: "why" }, item.why || ""),
          item.confirm_by?.length
            ? h(
                "ul",
                { key: "confirm" },
                item.confirm_by.map((entry, itemIndex) => h("li", { key: `confirm-${itemIndex}` }, entry))
              )
            : null
        ])
      )
    )
  ])
}

function ResultCard({ message }) {
  if (!message) {
    return h("div", { className: "empty-state" }, "아직 assistant 결과가 없다.")
  }

  const structured = message.structuredOutput || {}
  const summary = structured.summary || message.assistantText || "결과 없음"

  return h("div", { className: "result-layout" }, [
    h("div", { className: "result-summary", key: "summary" }, [
      h("div", { className: "result-topline", key: "top" }, [
        h(Badge, {
          key: "severity",
          label: structured.severity ? structured.severity.toUpperCase() : "UNSPECIFIED",
          tone: toneForSeverity(structured.severity)
        }),
        h(Badge, {
          key: "confidence",
          label: `confidence ${Math.round(Number(structured.confidence || 0) * 100)}%`,
          tone: Number(structured.confidence || 0) >= 0.7 ? "good" : "caution"
        }),
        structured.escalate_now
          ? h(Badge, { key: "escalate", label: "escalate now", tone: "warning" })
          : null
      ]),
      h("p", { key: "summary-text", className: "summary-text" }, summary),
      h("div", { className: "kv-grid", key: "kv" }, [
        h(KeyValue, { key: "impact", label: "User impact", value: structured.user_impact || "-" }),
        h(KeyValue, {
          key: "blast",
          label: "Blast radius",
          value: toArray(structured.blast_radius).join(", ") || "-"
        })
      ])
    ]),
    h("div", { className: "result-details", key: "details" }, [
      h(ListBlock, { key: "evidence", title: "Evidence", items: toArray(structured.evidence) }),
      h(HypothesesTable, { key: "hypotheses", items: toArray(structured.hypotheses) }),
      h(ListBlock, {
        key: "actions",
        title: "Recommended actions",
        items: toArray(structured.recommended_actions)
      }),
      h(ListBlock, {
        key: "questions",
        title: "Open questions",
        items: toArray(structured.open_questions)
      })
    ])
  ])
}

function MessagesList({ messages }) {
  if (!messages.length) {
    return h("div", { className: "empty-state" }, "메시지가 아직 없다.")
  }

  return h(
    "div",
    { className: "messages" },
    messages.map((message, index) => {
      const role = message?.info?.role || (message?.structuredOutput ? "assistant" : "message")
      const content = message?.assistantText || JSON.stringify(message?.structuredOutput || message?.info || {}, null, 2)
      return h("article", { className: "message-card", key: message.id || `message-${index}` }, [
        h("div", { className: "message-meta", key: "meta" }, [
          h(Badge, { key: "role", label: role, tone: role === "assistant" ? "good" : "muted" }),
          h(
            "span",
            { key: "time", className: "muted small" },
            formatTimestamp(message?.info?.time?.completed || message?.info?.time?.created)
          )
        ]),
        h("pre", { className: "message-content", key: "content" }, content)
      ])
    })
  )
}

function EventLog({ events }) {
  if (!events.length) {
    return h("div", { className: "empty-state" }, "아직 이벤트가 없다.")
  }

  return h(
    "div",
    { className: "event-log" },
    events.map((entry) =>
      h("article", { key: entry.id, className: "event-item" }, [
        h("div", { className: "event-top", key: "top" }, [
          h(Badge, { key: "type", label: entry.type, tone: entry.type.startsWith("permission") ? "warning" : "muted" }),
          h("span", { key: "time", className: "muted small" }, formatTimestamp(entry.at)),
          entry.sessionId ? h("code", { key: "session", className: "event-session" }, truncate(entry.sessionId, 18)) : null
        ]),
        h("pre", { className: "event-payload", key: "payload" }, JSON.stringify(entry.payload, null, 2))
      ])
    )
  )
}

function PermissionModal({ request, onReply, busy, onDismiss }) {
  if (!request) return null

  const patterns = request.patterns.length ? request.patterns : request.always

  return h("div", { className: "modal-backdrop" }, [
    h("div", { className: "modal", key: "modal" }, [
      h("div", { className: "modal-header", key: "header" }, [
        h("h3", { key: "title" }, "승인 필요"),
        h("button", { key: "close", className: "ghost-button", onClick: onDismiss, disabled: busy }, "닫기")
      ]),
      h("p", { key: "intro" }, "OpenCode가 추가 작업을 요청했다. 물리적으로 필요한 행동만 허용하라."),
      h("div", { className: "modal-grid", key: "grid" }, [
        h(KeyValue, { key: "permission", label: "Permission", value: request.permission }),
        h(KeyValue, { key: "requestId", label: "Request ID", value: truncate(request.id, 18) }),
        h(KeyValue, { key: "sessionId", label: "Session ID", value: truncate(request.sessionId, 18) })
      ]),
      request.message ? h("p", { key: "message", className: "callout" }, request.message) : null,
      h("div", { className: "list-block", key: "patterns" }, [
        h("h3", { key: "title" }, "Patterns / always scope"),
        patterns.length
          ? h(
              "ul",
              { key: "list" },
              patterns.map((item, index) => h("li", { key: `pattern-${index}` }, item))
            )
          : h("p", { key: "empty", className: "muted" }, "제안된 패턴 정보가 없다.")
      ]),
      h("div", { className: "modal-actions", key: "actions" }, [
        h(
          "button",
          {
            key: "once",
            className: "primary-button",
            disabled: busy,
            onClick: () => onReply("once")
          },
          busy ? "처리 중..." : "Approve once"
        ),
        h(
          "button",
          {
            key: "always",
            className: "secondary-button",
            disabled: busy,
            onClick: () => onReply("always")
          },
          "Approve always"
        ),
        h(
          "button",
          {
            key: "reject",
            className: "danger-button",
            disabled: busy,
            onClick: () => onReply("reject")
          },
          "Reject"
        )
      ])
    ])
  ])
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState("")
  const [streamStatus, setStreamStatus] = useState("connecting")
  const [streamError, setStreamError] = useState("")
  const [session, setSession] = useState(null)
  const [sessionTitle, setSessionTitle] = useState("checkout incident")
  const [prompt, setPrompt] = useState(
    "이번 배포 이후 checkout 502가 증가했다. 로그와 변경점 기준으로 evidence와 ranked hypotheses 중심으로 triage 해줘."
  )
  const [messages, setMessages] = useState([])
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [pendingPermission, setPendingPermission] = useState(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState("세션을 만들고 incident triage를 시작하라.")
  const activeSessionIdRef = useRef(null)
  const refreshTimeoutRef = useRef(null)

  useEffect(() => {
    activeSessionIdRef.current = session?.id || null
  }, [session])

  async function loadHealth() {
    try {
      const result = await api.getHealth()
      setHealth(result)
      setHealthError("")
    } catch (error) {
      setHealthError(error.message)
    }
  }

  async function loadMessages(sessionId) {
    if (!sessionId) return
    try {
      const result = await api.getMessages(sessionId)
      setMessages(Array.isArray(result) ? result : [])
    } catch (error) {
      setStatusMessage(`메시지 로딩 실패: ${error.message}`)
    }
  }

  async function loadPendingPermissions(sessionId) {
    if (!sessionId) return
    try {
      const result = await api.getPendingPermissions(sessionId)
      const list = Array.isArray(result) ? result : []
      const next = list[0] || null
      setPendingPermission(next)
      if (next && next.id !== pendingPermission?.id) {
        setShowPermissionModal(true)
      }
    } catch {
      return undefined
    }
    return undefined
  }

  function scheduleRefresh() {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => {
      const sessionId = activeSessionIdRef.current
      if (!sessionId) return
      loadMessages(sessionId)
      loadPendingPermissions(sessionId)
    }, 300)
  }

  useEffect(() => {
    loadHealth()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let cleanup = null
    let reconnectTimer = null

    const scheduleReconnect = () => {
      if (controller.signal.aborted) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, 2500)
    }

    const connect = async () => {
      try {
        cleanup = await subscribeToEventStream({
          url: api.resolve("/api/events"),
          signal: controller.signal,
          onOpen: () => {
            setStreamStatus("connected")
            setStreamError("")
          },
          onEvent: (frame) => {
            const entry = normalizeEventFrame(frame)
            setEvents((prev) => [entry, ...prev].slice(0, MAX_EVENT_LOG))

            const activeSessionId = activeSessionIdRef.current
            if (shouldRefreshForEvent(entry, activeSessionId)) {
              scheduleRefresh()
            }

            const request = extractPermissionRequest(entry)
            if (request && (!activeSessionId || request.sessionId === activeSessionId)) {
              setPendingPermission(request)
              setShowPermissionModal(true)
              setStatusMessage(`${request.permission} 승인 요청이 도착했다.`)
            }

            if (entry.type === "session.idle" && entry.sessionId && entry.sessionId === activeSessionId) {
              setSending(false)
              setStatusMessage("세션이 idle 상태로 돌아왔다.")
            }

            if (entry.type === "session.error" && entry.sessionId && entry.sessionId === activeSessionId) {
              setSending(false)
              setStatusMessage("세션 에러가 발생했다. 이벤트 로그를 확인하라.")
            }
          },
          onError: (error) => {
            if (controller.signal.aborted) return
            setStreamStatus("reconnecting")
            setStreamError(error.message)
            scheduleReconnect()
          },
          onClose: () => {
            if (controller.signal.aborted) return
            setStreamStatus("reconnecting")
            scheduleReconnect()
          }
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setStreamStatus("reconnecting")
        setStreamError(error.message)
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      controller.abort()
      if (cleanup) cleanup()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  const latestAssistant = useMemo(() => getLatestAssistantMessage(messages), [messages])

  async function ensureSession() {
    if (session?.id) return session
    const created = await api.createSession(sessionTitle || inferTitle(prompt))
    setSession(created)
    setStatusMessage("새 세션이 생성되었다.")
    setMessages([])
    return created
  }

  async function handleCreateSession(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const created = await api.createSession(sessionTitle || inferTitle(prompt))
      setSession(created)
      setMessages([])
      setPendingPermission(null)
      setShowPermissionModal(false)
      setStatusMessage("세션이 생성되었다. 이제 prompt를 전송하라.")
    } catch (error) {
      setStatusMessage(`세션 생성 실패: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleSendPrompt(event) {
    event.preventDefault()
    if (!prompt.trim()) return

    setBusy(true)
    setSending(true)
    try {
      const activeSession = await ensureSession()
      await api.sendPromptAsync(activeSession.id, {
        prompt,
        agent: "plan",
        structured: true,
        noReply: false
      })
      setStatusMessage("비동기 triage 요청을 보냈다. SSE와 메시지 패널을 확인하라.")
      scheduleRefresh()
    } catch (error) {
      setSending(false)
      setStatusMessage(`프롬프트 전송 실패: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleManualRefresh() {
    const sessionId = activeSessionIdRef.current
    if (!sessionId) return
    await Promise.all([loadMessages(sessionId), loadPendingPermissions(sessionId), loadHealth()])
    setStatusMessage("현재 세션 상태를 수동 새로고침했다.")
  }

  async function handlePermissionReply(reply) {
    if (!pendingPermission) return
    setApprovalBusy(true)
    try {
      await api.replyToPermission(pendingPermission.id, {
        sessionId: pendingPermission.sessionId,
        response: reply,
        remember: reply === "always"
      })
      setStatusMessage(`승인 응답을 전송했다: ${reply}`)
      setPendingPermission(null)
      setShowPermissionModal(false)
      scheduleRefresh()
    } catch (error) {
      setStatusMessage(`승인 응답 실패: ${error.message}`)
    } finally {
      setApprovalBusy(false)
    }
  }

  return h("div", { className: "app-shell" }, [
    h("header", { className: "hero", key: "hero" }, [
      h("div", { className: "hero-copy", key: "copy" }, [
        h("p", { className: "eyebrow", key: "eyebrow" }, "First principles minimal UI"),
        h("h1", { key: "title" }, "OpenCode Incident Triage Console"),
        h(
          "p",
          { key: "subtitle", className: "hero-subtitle" },
          "필수 상태만 남겼다: session, prompt, permission, event stream, structured result. 그 외는 운영 데이터를 통해 확장하라."
        )
      ]),
      h("div", { className: "hero-status", key: "status" }, [
        h(Badge, {
          key: "stream",
          label: `stream ${streamStatus}`,
          tone: streamStatus === "connected" ? "good" : "warning"
        }),
        health?.upstream?.version
          ? h(Badge, { key: "version", label: `opencode ${health.upstream.version}`, tone: "muted" })
          : null,
        session?.id ? h(Badge, { key: "session", label: `session ${truncate(session.id, 14)}`, tone: "muted" }) : null
      ])
    ]),
    h("main", { className: "main-grid", key: "main" }, [
      h("div", { className: "column" , key: "left"}, [
        h(SectionCard, {
          key: "session-card",
          title: "1. Session",
          subtitle: "사용자 서비스의 최소 단위는 대화가 아니라 세션이다.",
          actions: h(
            "button",
            { className: "secondary-button", onClick: handleManualRefresh, disabled: !session?.id },
            "Refresh"
          )
        }, [
          h("form", { className: "stack", onSubmit: handleCreateSession, key: "form" }, [
            h("label", { className: "field", key: "title-field" }, [
              h("span", { key: "label" }, "Session title"),
              h("input", {
                key: "input",
                value: sessionTitle,
                onChange: (event) => setSessionTitle(event.target.value),
                placeholder: "checkout incident"
              })
            ]),
            h(
              "button",
              { key: "submit", className: "primary-button", type: "submit", disabled: busy },
              busy ? "Working..." : "Create session"
            )
          ]),
          h("div", { className: "stack compact", key: "status-panel" }, [
            h(KeyValue, { key: "health", label: "Health", value: health?.ok ? "healthy" : healthError || "unknown" }),
            h(KeyValue, { key: "stream-status", label: "Stream", value: streamError || streamStatus }),
            h(KeyValue, {
              key: "current-session",
              label: "Current session",
              value: session?.id ? truncate(session.id, 24) : "not created"
            })
          ]),
          h("p", { className: "status-line", key: "status-line" }, statusMessage)
        ]),
        h(SectionCard, {
          key: "prompt-card",
          title: "2. Prompt",
          subtitle: "가장 작은 입력만 주고 structured output을 강제하라."
        }, [
          h("form", { className: "stack", onSubmit: handleSendPrompt, key: "prompt-form" }, [
            h("label", { className: "field", key: "prompt-field" }, [
              h("span", { key: "label" }, "Incident prompt"),
              h("textarea", {
                key: "textarea",
                rows: 8,
                value: prompt,
                onChange: (event) => setPrompt(event.target.value),
                placeholder: "로그, 변경점, 영향 범위를 포함한 triage prompt"
              })
            ]),
            h(
              "button",
              { key: "submit", className: "primary-button", type: "submit", disabled: busy || !prompt.trim() },
              sending ? "Running..." : "Send prompt"
            )
          ])
        ]),
        h(SectionCard, {
          key: "messages-card",
          title: "3. Messages",
          subtitle: "세션의 실제 산출물은 메시지와 structured result다."
        }, [h(MessagesList, { key: "messages", messages })])
      ]),
      h("div", { className: "column wide", key: "center" }, [
        h(SectionCard, {
          key: "result-card",
          title: "4. Structured triage result",
          subtitle: "Summary, severity, hypotheses, next actions를 같은 화면에 고정했다."
        }, [h(ResultCard, { key: "result", message: latestAssistant })])
      ]),
      h("div", { className: "column", key: "right" }, [
        h(SectionCard, {
          key: "approval-card",
          title: "5. Pending approval",
          subtitle: "권한은 서비스 레이어가 책임지고, agent는 실행만 한다."
        }, [
          pendingPermission
            ? h("div", { className: "stack compact", key: "approval" }, [
                h(KeyValue, { key: "permission", label: "Permission", value: pendingPermission.permission }),
                h(KeyValue, {
                  key: "permission-id",
                  label: "Request ID",
                  value: truncate(pendingPermission.id, 20)
                }),
                h(
                  "div",
                  { className: "button-row", key: "buttons" },
                  [
                    h(
                      "button",
                      {
                        key: "once",
                        className: "primary-button",
                        disabled: approvalBusy,
                        onClick: () => handlePermissionReply("once")
                      },
                      "Once"
                    ),
                    h(
                      "button",
                      {
                        key: "always",
                        className: "secondary-button",
                        disabled: approvalBusy,
                        onClick: () => handlePermissionReply("always")
                      },
                      "Always"
                    ),
                    h(
                      "button",
                      {
                        key: "reject",
                        className: "danger-button",
                        disabled: approvalBusy,
                        onClick: () => handlePermissionReply("reject")
                      },
                      "Reject"
                    )
                  ]
                )
              ])
            : h("div", { key: "empty", className: "empty-state" }, "현재 승인 요청이 없다.")
        ]),
        h(SectionCard, {
          key: "event-card",
          title: "6. Event stream",
          subtitle: "SSE를 원문에 가깝게 보여 주고, 필요한 것만 UI 상태로 승격했다."
        }, [h(EventLog, { key: "events", events })])
      ])
    ]),
    h(PermissionModal, {
      key: "modal",
      request: showPermissionModal ? pendingPermission : null,
      onReply: handlePermissionReply,
      onDismiss: () => setShowPermissionModal(false),
      busy: approvalBusy
    })
  ])
}
