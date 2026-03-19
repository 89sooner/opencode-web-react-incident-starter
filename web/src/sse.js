export async function subscribeToEventStream({ url, signal, onOpen, onEvent, onError, onClose }) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream"
    },
    signal
  })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to subscribe to event stream: ${response.status}`)
  }

  onOpen?.()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let currentEvent = "message"
  let dataLines = []

  function flush() {
    if (!dataLines.length) {
      currentEvent = "message"
      return
    }

    const raw = dataLines.join("\n")
    let data = raw
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }

    onEvent?.({ event: currentEvent || "message", data, raw })
    currentEvent = "message"
    dataLines = []
  }

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        let lineEnd = buffer.indexOf("\n")

        while (lineEnd >= 0) {
          let line = buffer.slice(0, lineEnd)
          buffer = buffer.slice(lineEnd + 1)
          if (line.endsWith("\r")) line = line.slice(0, -1)

          if (!line) {
            flush()
          } else if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim() || "message"
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart())
          }

          lineEnd = buffer.indexOf("\n")
        }
      }

      if (buffer.trim()) {
        dataLines.push(buffer.trim())
      }
      flush()
      if (!signal?.aborted) onClose?.()
    } catch (error) {
      if (signal?.aborted) return
      onError?.(error)
    }
  })()

  return () => {
    try {
      reader.cancel()
    } catch {
      return undefined
    }
    return undefined
  }
}
