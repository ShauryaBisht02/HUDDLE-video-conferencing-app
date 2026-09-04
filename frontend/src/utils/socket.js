export function createSocket(roomId, userId, onMessage, initialPayload) {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "localhost:8000";
  const protocol = BACKEND_URL.includes("localhost") ? "ws" : "wss";
  const socket = new WebSocket(`${protocol}://${BACKEND_URL}/ws/${roomId}/${userId}`);

  socket.onopen = () => {
    console.log("✅ Connected to signaling server");
    if (initialPayload) {
      socket.send(JSON.stringify(initialPayload));
    }
  };
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  socket.onclose = () => console.log("❌ Disconnected");
  socket.onerror = (err) => console.error("WebSocket error:", err);

  return socket;
}