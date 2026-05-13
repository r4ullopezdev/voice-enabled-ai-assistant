const { handleTranscription, sendJson } = require("./_shared")

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" })
    return
  }

  try {
    await handleTranscription(req, res)
  } catch (error) {
    console.error(error)
    sendJson(res, 500, { error: error.message || "Internal server error" })
  }
}
