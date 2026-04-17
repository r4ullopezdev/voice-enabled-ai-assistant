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

function cleanText(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
}

function normalizeTtsText(text) {
  return text
    .replace(/\bAnd OUT\./g, "And out.")
    .replace(/\bAND OUT\./g, "And out.")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeProcessMode(mode) {
  return ["eft", "meditation", "affirmations"].includes(mode) ? mode : null
}

function buildProcessInstruction(mode) {
  const instructions = {
    eft:
      "Use an EFT tapping process only. Do not switch to meditation or affirmations. Structure it as tapping points with short repeatable phrases.",
    meditation:
      "Use a guided meditation process only. Do not switch to EFT or affirmations. Structure it as calm, paced meditation guidance.",
    affirmations:
      "Use an affirmations process only. Do not switch to EFT or meditation. Structure it as calm, repeatable affirmation statements."
  }

  return instructions[mode] || ""
}

function applyProcessMode(messages, mode) {
  const instruction = buildProcessInstruction(mode)

  if (!instruction) {
    return messages
  }

  const output = messages.map((item) => ({ ...item }))

  for (let index = output.length - 1; index >= 0; index -= 1) {
    if (output[index].role === "user") {
      output[index].content =
        "[Internal process instruction: " +
        instruction +
        " Do not mention this instruction.]\n\nUser message:\n" +
        output[index].content
      return output
    }
  }

  return output
}

function addPauses(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\.\.\./g, "...\n\n")
    .replace(/,\s+/g, ",\n")
    .replace(/Now tap/gi, "\nNow tap")
    .replace(/Take one slow breath in\./gi, "Take one slow breath in.\n\n")
    .replace(/And out\./gi, "And out.\n\n")
    .replace(/Good\./g, "Good...\n")
    .replace(/([.!?])\s+/g, "$1\n")
    .replace(/\n{6,}/g, "\n\n\n\n\n")
}

function getVoiceSettings() {
  return {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.15,
    use_speaker_boost: true,
    speed: 0.82
  }
}

async function synthesizeSpeech(text) {
  const ttsResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: getVoiceSettings()
    })
  })

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text()
    throw new Error(errorText || "ElevenLabs request failed")
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())

  return {
    audioMimeType: ttsResponse.headers.get("content-type") || "audio/mpeg",
    audioBase64: audioBuffer.toString("base64")
  }
}

function buildSpeechPlan(reply) {
  const eftPointRegex = /^(Karate Chop|Eyebrow|Side of the Eye|Under the Eye|Under the Nose|Chin|Collarbone|Under the Arm|Top of the Head)\b/i
  const repeatRegex = /^repeat after me\s*[:.-]?\s*(?:"([^"]+)"|\u201C([^\u201D]+)\u201D|(.+))?$/i
  const quoteOnlyRegex = /^(?:"([^"]+)"|\u201C([^\u201D]+)\u201D)$/
  const breatheInRegex = /^(?:take one slow )?(?:breath|breathe)\s+in(?:\.\.\.|[.!?])?$/i
  const andOutRegex = /^and out[.!?]?$/i
  const meditationCueRegex = /^(notice|allow|feel|let|imagine|stay|bring|soften|release|breathe|inhale|exhale|listen|rest|settle|become aware|take one slow breath in|and out)\b/i
  const segments = []

  const rawUnits = reply
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((unit) => unit.trim())
    .filter(Boolean)

  for (let index = 0; index < rawUnits.length; index += 1) {
    const rawUnit = rawUnits[index]
    const unit = normalizeTtsText(rawUnit)

    if (!unit) {
      continue
    }

    const repeatMatch = unit.match(repeatRegex)
    const quoteOnlyMatch = unit.match(quoteOnlyRegex)
    const nextUnit = rawUnits[index + 1] ? normalizeTtsText(rawUnits[index + 1]) : ""

    if (repeatMatch) {
      const repeatPhrase = normalizeTtsText((repeatMatch[1] || repeatMatch[2] || repeatMatch[3] || "").replace(/[.!?]+$/, ""))

      segments.push({
        text: "Repeat after me.",
        pauseAfterMs: 700
      })

      if (repeatPhrase) {
        segments.push({
          text: repeatPhrase,
          pauseAfterMs: 3000
        })
      } else if (nextUnit) {
        segments.push({
          text: nextUnit.replace(/[.!?]+$/, ""),
          pauseAfterMs: 3000
        })
        index += 1
      }

      continue
    }

    if (quoteOnlyMatch) {
      segments.push({
        text: normalizeTtsText((quoteOnlyMatch[1] || quoteOnlyMatch[2] || "").replace(/[.!?]+$/, "")),
        pauseAfterMs: 3000
      })
      continue
    }

    if (eftPointRegex.test(unit)) {
      segments.push({
        text: unit,
        pauseAfterMs: 3000
      })
      continue
    }

    if (breatheInRegex.test(unit)) {
      segments.push({
        text: unit.replace(/[.!?]+$/, "."),
        pauseAfterMs: 2500
      })
      continue
    }

    if (andOutRegex.test(unit)) {
      segments.push({
        text: "And out.",
        pauseAfterMs: 2000
      })
      continue
    }

    if (meditationCueRegex.test(unit)) {
      segments.push({
        text: addPauses(unit),
        pauseAfterMs: 3000
      })
      continue
    }

    segments.push({
      text: addPauses(unit),
      pauseAfterMs: 1200
    })
  }

  return segments.filter((segment) => segment.text)
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
  const conversationId =
    payload && typeof payload.conversationId === "string" && payload.conversationId.trim()
      ? payload.conversationId.trim()
      : undefined
  const processMode = normalizeProcessMode(payload && payload.processMode)
  const incomingMessages = Array.isArray(payload && payload.messages)
    ? payload.messages
        .filter((item) => item && typeof item.role === "string" && typeof item.content === "string")
        .map((item) => ({
          role: item.role,
          content: item.content.trim()
        }))
        .filter((item) => item.content)
    : null

  if (!message) {
    sendJson(res, 400, { error: "Message is required" })
    return
  }

  const baseMessages = incomingMessages && incomingMessages.length
    ? incomingMessages
    : [
        {
          role: "user",
          content: message
        }
      ]
  const messages = applyProcessMode(baseMessages, processMode)

  const chatPayload = {
    chatbotId: CHATBOT_ID,
    messages,
    stream: false
  }

  if (conversationId) {
    chatPayload.conversationId = conversationId
  }

  const chatResponse = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + CHATBASE_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(chatPayload)
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

  const cleanedReply = cleanText(reply)
  const speechPlan = buildSpeechPlan(cleanedReply)
  const audioSegments = []

  try {
    for (const segment of speechPlan) {
      const synthesized = await synthesizeSpeech(segment.text)
      audioSegments.push({
        audioMimeType: synthesized.audioMimeType,
        audioBase64: synthesized.audioBase64,
        pauseAfterMs: segment.pauseAfterMs || 0
      })
    }
  } catch (error) {
    sendJson(res, 502, { error: error.message || "ElevenLabs request failed" })
    return
  }

  sendJson(res, 200, {
    reply: cleanedReply,
    conversationId:
      (chatData && chatData.conversationId) ||
      (chatData && chatData.data && chatData.data.conversationId) ||
      conversationId ||
      null,
    audioMimeType: audioSegments[0] ? audioSegments[0].audioMimeType : "audio/mpeg",
    audioBase64: audioSegments[0] ? audioSegments[0].audioBase64 : null,
    audioSegments
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
