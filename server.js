const http = require("http")
const fs = require("fs")
const path = require("path")

loadEnvFile()

const PORT = process.env.PORT || 3000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHATBASE_API = process.env.CHATBASE_API
const CHATBOT_ID = process.env.CHATBOT_ID
const ELEVEN_API = process.env.ELEVEN_API
const VOICE_ID = process.env.VOICE_ID

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env")

  if (!fs.existsSync(envPath)) {
    return
  }

  const envContent = fs.readFileSync(envPath, "utf8")

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" })
  res.end(JSON.stringify(payload))
}

function serveIndex(res) {
  const filePath = path.join(__dirname, "index.html")
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 500, { error: "Failed to load index.html" })
      return
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(content)
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []

    req.on("data", (chunk) => {
      chunks.push(chunk)
    })

    req.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    req.on("error", reject)
  })
}

async function handleTranscription(req, res) {
  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "Missing OPENAI_API_KEY in server environment" })
    return
  }

  const audioBuffer = await readBody(req)

  if (!audioBuffer.length) {
    sendJson(res, 400, { error: "Empty audio payload" })
    return
  }

  const form = new FormData()
  const contentType = req.headers["content-type"] || "audio/webm"
  form.append("file", new Blob([audioBuffer], { type: contentType }), "recording.webm")
  form.append("model", "gpt-4o-mini-transcribe")

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + OPENAI_API_KEY
    },
    body: form
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    sendJson(res, response.status, {
      error: data && data.error && data.error.message ? data.error.message : "Transcription request failed"
    })
    return
  }

  sendJson(res, 200, { text: data && data.text ? data.text : "" })
}

async function handleChatVoice(req, res) {
  if (!CHATBASE_API || !CHATBOT_ID || !ELEVEN_API || !VOICE_ID) {
    sendJson(res, 500, { error: "Missing Chatbase or ElevenLabs credentials in server environment" })
    return
  }

  const rawBody = await readBody(req)
  let payload

  try {
    payload = JSON.parse(rawBody.toString("utf8"))
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" })
    return
  }

  const message = payload && typeof payload.message === "string" ? payload.message.trim() : ""

  if (!message) {
    sendJson(res, 400, { error: "Message is required" })
    return
  }

  const chatResponse = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + CHATBASE_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chatbotId: CHATBOT_ID,
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      stream: false
    })
  })

  const chatData = await chatResponse.json().catch(() => null)

  if (!chatResponse.ok) {
    sendJson(res, chatResponse.status, {
      error: chatData && chatData.message ? chatData.message : "Chatbase request failed"
    })
    return
  }

  const reply =
    (chatData && (chatData.text || chatData.message || chatData.response)) ||
    (chatData && chatData.data && (chatData.data.text || chatData.data.message || chatData.data.response)) ||
    ""

  if (!reply) {
    sendJson(res, 502, { error: "Chatbase returned an empty reply" })
    return
  }

  const ttsResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: reply,
      model_id: "eleven_multilingual_v2"
    })
  })

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text()
    sendJson(res, ttsResponse.status, {
      error: errorText || "ElevenLabs request failed"
    })
    return
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  sendJson(res, 200, {
    reply,
    audioMimeType: ttsResponse.headers.get("content-type") || "audio/mpeg",
    audioBase64: audioBuffer.toString("base64")
  })
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      serveIndex(res)
      return
    }

    if (req.method === "POST" && req.url === "/api/transcribe") {
      await handleTranscription(req, res)
      return
    }

    if (req.method === "POST" && req.url === "/api/chat-voice") {
      await handleChatVoice(req, res)
      return
    }

    sendJson(res, 404, { error: "Not found" })
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { error: error.message || "Internal server error" })
  }
})

server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT)
})
