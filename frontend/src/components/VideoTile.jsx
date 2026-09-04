import { useEffect, useRef } from "react";

export default function VideoTile({ stream, label, isLocal, audioOn = true, isPinned, onPin, handRaised }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className={`video-tile ${isPinned ? "pinned" : ""}`} onClick={onPin}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      {!audioOn && <span className="mute-badge">🔇</span>}
      {handRaised && <span className="hand-badge">✋</span>}
      <div className="tile-footer">
        <span className="tile-label">{label}</span>
        {audioOn && <span className="mic-wave"><i></i><i></i><i></i></span>}
      </div>
      {isPinned && <span className="pin-badge">📌 Pinned</span>}
    </div>
  );
}