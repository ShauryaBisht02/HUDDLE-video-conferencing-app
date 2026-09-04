export function createSocket(roomId, userId, onMessage, initialPayload) {
  const socket = new WebSocket(`ws://localhost:8000/ws/${roomId}/${userId}`);

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