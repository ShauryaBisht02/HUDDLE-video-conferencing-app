import { useState } from "react";

export default function ChatPanel({ messages, onSend, participantNames = {} }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <>
      <button className="chat-toggle" onClick={() => setOpen(!open)}>
        💬
        {messages.length > 0 && <span className="chat-badge">{messages.length}</span>}
      </button>

      <div className={`chat-panel ${open ? "open" : ""}`}>
        <div className="chat-header">
          <span>💬 Meeting Chat</span>
          <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet — say hi 👋</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.isLocal ? "mine" : "theirs"}`}>
              <span className="chat-sender">
                {m.isLocal ? "You" : participantNames[m.sender] || m.sender}
              </span>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
          />
          <button onClick={handleSend}>➤</button>
        </div>
      </div>
    </>
  );
}