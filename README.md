# TDT Voice Test

Minimal voice-enabled AI assistant prototype for validating a browser-to-backend interaction loop with Chatbase and ElevenLabs.

## Overview

This repository contains a small full-stack implementation that supports:

- text input
- microphone-triggered input
- AI response generation through Chatbase
- synthesized voice playback through ElevenLabs

The project is intentionally lightweight. It is designed to validate product direction and integration constraints before committing to a larger production build.

## Scope

Included:

- single-page browser UI
- local Node.js HTTP server
- environment-driven configuration
- end-to-end text-to-response flow
- browser-based microphone flow for local testing

Not included:

- authentication
- persistence
- analytics
- test suite
- deployment configuration
- hardened production controls

## Architecture

### Frontend

[`index.html`](/C:/Users/Raul%20Lopez/Documents/upwork01/index.html)

- renders the interface
- captures text input
- handles microphone interaction
- calls local API endpoints
- plays synthesized audio responses

### Backend

[`server.js`](/C:/Users/Raul%20Lopez/Documents/upwork01/server.js)

- serves the frontend
- exposes local API routes
- forwards user input to Chatbase
- converts AI text output to speech through ElevenLabs

### Configuration

[`.env.example`](/C:/Users/Raul%20Lopez/Documents/upwork01/.env.example)

- documents required environment variables
- keeps runtime credentials out of version control

## Request Flow

### Text path

1. User submits a message from the browser.
2. Frontend sends the payload to `/api/chat-voice`.
3. Backend requests a response from Chatbase.
4. Backend sends the reply text to ElevenLabs.
5. Frontend receives reply text and audio, then renders and plays the result.

### Voice path

1. User starts microphone capture.
2. The browser attempts speech recognition when supported.
3. The recognized transcript is inserted into the input field.
4. The standard text path executes.

This implementation favors simplicity for prototyping. In a production integration, server-side transcription is usually the more reliable fallback strategy.

## Requirements

- Node.js 18+
- Chatbase API key
- Chatbase chatbot ID
- ElevenLabs API key
- ElevenLabs voice ID
- optional OpenAI API key for future server-side transcription work

## Local Development

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Provide valid credentials in `.env`.
4. Start the server:

```bash
node server.js
```

5. Open `http://localhost:3000`.

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
CHATBASE_API=your_chatbase_api_key
CHATBOT_ID=your_chatbot_id
ELEVEN_API=your_elevenlabs_api_key
VOICE_ID=your_elevenlabs_voice_id
```

## Operational Notes

- `http://localhost` is sufficient for local testing.
- Production deployment should run over `https`.
- Microphone behavior depends on browser support and embedding context.
- Browser speech recognition support is not uniform across Chrome, Edge, Safari, and Firefox.
- If this experience is embedded inside a members area, permissions policy, iframe restrictions, and CORS strategy need to be validated explicitly.

## Security

This repository is structured to be safe for public source control:

- runtime secrets are expected in `.env`
- `.env` is excluded from Git
- no live credentials should be committed
- any previously exposed credentials should be rotated

## Production Considerations

This codebase is a prototype foundation, not a production drop-in.

Before using the flow in a live product, address at least the following:

- authentication and request authorization
- robust error handling and user feedback
- HTTPS and deployment topology
- logging and monitoring
- rate limiting
- browser compatibility strategy
- server-side transcription fallback
- embeddable widget or app-shell integration approach

## Roadmap

- add server-side transcription fallback
- add deployment instructions
- add embeddable integration mode
- improve observability
- add automated tests
- formalize API boundaries

## Contributing

Issues and pull requests are welcome when they improve clarity, reliability, or production readiness.

## License

MIT. See [`LICENSE`](/C:/Users/Raul%20Lopez/Documents/upwork01/LICENSE).
