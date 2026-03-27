# TDT Voice Test

Public-safe prototype for a browser-based AI coach flow with:

- text input
- microphone capture
- Chatbase response generation
- ElevenLabs voice playback

This project is a lightweight proof of concept for testing an AI assistant experience before integrating it into a members area or production web app.

## What This Is

`TDT Voice Test` is a minimal full-stack demo that lets a user:

1. type a message or speak through the microphone
2. send that input to an AI coach
3. receive a text reply
4. hear the response played back as audio

The current version is intentionally small:

- frontend: plain HTML, CSS, and browser APIs
- backend: a simple Node.js HTTP server
- no framework
- no database
- no authentication layer

## Who This Is For

This repo is useful if you want to:

- prototype a voice-enabled AI assistant
- test a coaching or support chatbot with voice output
- validate a browser-based mic-to-response flow before production integration
- study a very small example without React, Next.js, or other framework overhead

## Features

- clean single-page UI
- text message sending
- microphone button for voice input
- browser speech recognition fallback path when supported
- Chatbase API request for the AI reply
- ElevenLabs text-to-speech playback
- local `.env` configuration

## Current Architecture

- `index.html`
  Contains the UI and browser-side logic.

- `server.js`
  Serves the page and exposes local API routes for chat and voice.

- `.env.example`
  Template for required environment variables.

## Important Status Note

This is a prototype, not a production-ready package.

It is suitable for:

- local testing
- demoing the interaction flow
- validating UX direction

It still needs additional work for production use, especially around:

- authentication
- error handling depth
- browser compatibility
- iframe compatibility
- CORS strategy
- HTTPS deployment
- secure secret management
- better transcription reliability across browsers

## Requirements

- Node.js 18+ recommended
- Chatbase API key and chatbot ID
- ElevenLabs API key and voice ID
- optional OpenAI API key if you later switch to server-side transcription

## Local Setup

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Add your own credentials to `.env`.
4. Run:

```bash
node server.js
```

5. Open:

```text
http://localhost:3000
```

## Environment Variables

Create a local `.env` file with:

```env
OPENAI_API_KEY=your_openai_api_key
CHATBASE_API=your_chatbase_api_key
CHATBOT_ID=your_chatbot_id
ELEVEN_API=your_elevenlabs_api_key
VOICE_ID=your_elevenlabs_voice_id
```

## How The Flow Works

### Text flow

1. User types a message.
2. Frontend sends it to `/api/chat-voice`.
3. Server calls Chatbase.
4. Server sends the reply text to ElevenLabs.
5. Frontend receives text plus audio and plays the audio.

### Voice flow

1. User clicks `Speak`.
2. The browser tries speech recognition first when available.
3. The transcribed text is inserted into the input.
4. The normal chat flow runs.

If browser speech recognition is not available, the app can be extended to use server-side transcription instead.

## Browser Notes

Microphone support is environment-dependent.

In practice, results are best when:

- using Chrome or Edge
- running over `http://localhost` in local development
- running over `https` in production
- not being embedded in a restricted `iframe`

Some production environments may require extra work because microphone permissions can be blocked by:

- browser limitations
- iframe sandboxing
- permissions policy headers
- members area platform restrictions

## Security

This repository is intended to be safe for public GitHub publishing.

Rules:

- never commit `.env`
- never commit live API keys
- use environment variables for all secrets
- rotate keys immediately if they were ever exposed

Included in `.gitignore`:

- `.env`
- local logs
- `node_modules`

## Production Integration Notes

If you plan to embed this inside a members area, expect to adjust:

- API endpoint locations
- HTTPS setup
- authentication
- CORS
- microphone permissions
- iframe strategy
- browser fallback behavior

A stronger production version would likely move toward:

- a dedicated frontend app or embeddable widget
- a hosted backend API
- server-side transcription fallback
- structured logging
- rate limiting
- better validation and monitoring

## Roadmap Ideas

- add server-side transcription fallback
- add deployment instructions
- add embeddable widget mode
- add configurable prompts
- add conversation history
- add better status and error states
- add automated tests

## Contributing

Issues and suggestions are welcome.

If you use this project as a base for your own voice assistant workflow, feel free to fork it and adapt it to your stack.

## License

No license has been added yet.

If you want public reuse, add an open-source license such as MIT.
