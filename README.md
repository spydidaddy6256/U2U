# U2U — USER TO USER
### Premium Private Chat Web App

> **User to User. Nothing permanent.**  
> A temporary, privacy-first, end-to-end encrypted communication web application designed for exactly two people.

---

## 1. Core Principles

- **Exactly Two Participants**: Strict session cap. No third participant can ever join.
- **Zero Accounts**: No registration, no telephone numbers, no emails, no profile avatars, no permanent identifiers.
- **24-Hour Ephemeral Lifecycle**: All rooms and temporary server envelopes automatically expire and delete after 24 hours.
- **True End-to-End Encryption (E2EE)**:
  - Cryptographic standard: Authenticated **AES-256-GCM** via the W3C Web Crypto API (`window.crypto.subtle`).
  - Key derivation: **PBKDF2** with **100,000 iterations** of **SHA-256** using the session salt and secret passcode.
  - Unique 96-bit (12-byte) initialization vector (IV) generated client-side for every single message and photo.
  - Plaintext and keys **never touch the server**.
- **Ephemeral Media & View Once**:
  - Images compressed and encrypted client-side prior to transmission.
  - Optional **View Once** mode: once opened in the custom fullscreen viewer and closed, image buffers are wiped and permanently marked expired.
- **Deliberate Destructive Controls**:
  - **Clear Chat**: Purges the local message history on the device.
  - **Burn Session**: Irrevocably destroys the session for both participants, purges all temporary server buffers, and immediately redirects both users.
- **Screen Privacy Shield**:
  - Automatically blurs or hides sensitive conversation when the browser tab loses focus, with a single-click restore shield.
- **Tailored Aesthetics & Audio**:
  - Bespoke color palette: cinematic dark charcoal and warm light mode with an intimate terracotta accent (`#E05E46`).
  - Subtly synthesized Web Audio API tactile feedback (zero external audio files).

---

## 2. Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Running Locally
To run both the backend WebSocket relay and the Vite dev server:
```bash
# Terminal 1: Backend WebSocket & API Server
npm run server

# Terminal 2: Frontend Dev Server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm start
```
The server will run on port `3001` serving both the production bundle and the secure WebSocket `/ws`.

---

## 3. Product Flow

1. **Landing**: Clean, focused interface with two connected points visual mark.
2. **Create a Session**: Smooth transition generating a human-readable Session ID (e.g., `7K4M-X92P-Q8`) and high-entropy Passcode. Supports single-tap copying with tactile feedback, Web Share API, and client-generated QR Code.
3. **Join a Session**: Auto-hyphenation, uppercase normalization, paste support, and a <1s connection transition.
4. **Chat**: Centered conversation column, optimistic message rendering, real-time typing indicators, delivery checkmarks, and photo encryption.
5. **Disappear**: Disconnect, clear, burn, or let the 24-hour countdown expire.
