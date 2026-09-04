# 🎥 Huddle — Every Conversation Matters

A real-time, peer-to-peer video conferencing platform built with WebRTC, FastAPI, and React. Huddle supports live video/audio calls, screen sharing, in-call chat, host-controlled room access, and more — all without a database, powered by direct browser-to-browser media streaming.

**🔗 Live App:** [huddle-video-conferencing-app.vercel.app](https://huddle-video-conferencing-app.vercel.app)

---

## ✨ Features

- **Real-time video & audio calls** — peer-to-peer media streaming via WebRTC (no server-side video processing)
- **Screen sharing** — swap your camera feed for your screen mid-call, auto-reverts when you stop
- **In-call chat** — real-time messaging over the same signaling channel
- **Pre-join lobby** — camera/mic preview and name entry before joining
- **Random room codes & shareable links** — Meet/Zoom-style room codes (`abc-def-ghi`) with direct join links
- **QR code join** — scan-to-join for mobile participants
- **Pin a participant** — spotlight view for the active speaker or presenter
- **Raise hand** — visual hand-raise indicator, synced across all participants
- **Live mute/camera indicators** — Google Meet–style badges visible to everyone, not just you
- **Host controls** — the room creator can toggle between **Open** (anyone with the link joins instantly) and **Private** (join requests need host approval) at any time during the call
- **Auto-expiring rooms** — empty rooms are cleaned up automatically after 5 minutes of inactivity
- **Adaptive grid layout** — video grid re-flows based on participant count

---

## 🛠️ Tech Stack

**Frontend:** React (Vite), React Router, WebRTC APIs (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`), native WebSocket client, `qrcode.react`

**Backend:** FastAPI (Python), WebSockets for signaling (SDP offer/answer + ICE candidate relay), in-memory room/session management

**Real-time media:** WebRTC peer-to-peer connections, Google STUN server for NAT traversal

**Deployment:** Backend on Render, frontend on Vercel

---

## 🏗️ Architecture

Huddle uses a **mesh peer-to-peer architecture**: every participant connects directly to every other participant, and video/audio never touches the server. The FastAPI backend acts purely as a **signaling server** — it relays connection-setup messages (SDP offers/answers, ICE candidates) between peers over WebSockets, and lets peers establish a direct `RTCPeerConnection` for actual media transfer.

```
Client A  ──┐                    ┌── Client B
            │   Signaling only   │
            └── FastAPI Server ──┘
            │  (WebSocket relay) │
Client A  ══╪════════════════════╪══  Client B
            (direct P2P media stream)
```

This keeps the backend lightweight and avoids server-side video processing costs, but does mean the mesh topology scales best for small groups (each peer's upload bandwidth grows with participant count). A future iteration using an SFU (Selective Forwarding Unit) would be the natural next step to support larger calls.

---

## 🚀 Running Locally

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — backend runs on `http://localhost:8000`.

---

## 📌 Notes

- The free-tier backend (Render) spins down after inactivity; the first connection after idle time may take 30–50 seconds to wake up.
- Screen sharing and camera/mic access require HTTPS in production (handled automatically by Vercel/Render) or `localhost` in development.

---

## 📄 License

MIT
