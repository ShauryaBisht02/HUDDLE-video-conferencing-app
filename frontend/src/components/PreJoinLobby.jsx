import { useEffect, useRef, useState } from "react";

export default function PreJoinLobby({ roomId, onJoin, onBack }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((err) => console.error("Camera/mic access denied:", err));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleAudio = () => {
    const track = stream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioOn(track.enabled);
    }
  };

  const toggleVideo = () => {
    const track = stream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoOn(track.enabled);
    }
  };

  const handleJoin = () => {
    const finalName = name.trim() || "Guest";
    onJoin(audioOn, videoOn, finalName, "open");
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <h2>Ready to join?</h2>
        <p className="lobby-room-id">Room: {roomId}</p>

        <div className="lobby-preview">
          <video ref={videoRef} autoPlay playsInline muted />
          {!videoOn && <div className="lobby-cam-off">📷 Camera Off</div>}
        </div>

        <input
          className="lobby-name-input"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          maxLength={20}
        />

        <div className="lobby-controls">
          <button className={`ctrl-btn ${!audioOn ? "off" : ""}`} onClick={toggleAudio}>
            {audioOn ? "🎤" : "🔇"}
          </button>
          <button className={`ctrl-btn ${!videoOn ? "off" : ""}`} onClick={toggleVideo}>
            {videoOn ? "📷" : "🚫"}
          </button>
        </div>

        <div className="lobby-actions">
          <button className="lobby-back-btn" onClick={onBack}>
            ← Back
          </button>
          <button className="join-btn" onClick={handleJoin}>
            Join Now →
          </button>
        </div>
      </div>
    </div>
  );
}