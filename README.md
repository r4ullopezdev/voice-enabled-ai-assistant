# TDT Voice Test

Simple local prototype for:

- sending a message to a Chatbase agent
- generating voice playback with ElevenLabs
- testing microphone input in the browser

## What this repo includes

- a minimal Node.js server in `server.js`
- a single-page frontend in `index.html`
- environment variable template in `.env.example`

## Local setup

1. Install Node.js.
2. Copy `.env.example` to `.env`.
3. Add your own API credentials to `.env`.
4. Run `node server.js`.
5. Open `http://localhost:3000`.

## Environment variables

- `OPENAI_API_KEY`
- `CHATBASE_API`
- `CHATBOT_ID`
- `ELEVEN_API`
- `VOICE_ID`

## Security

This repository is intended to be public-safe:

- do not commit `.env`
- do not commit live API keys
- rotate any key that was ever shared or exposed

## Notes

The current microphone flow prefers browser speech recognition when available. Production integration may require a different transcription path depending on browser support, iframe restrictions, permissions policy, and deployment architecture.
