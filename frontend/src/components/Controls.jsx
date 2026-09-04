import { useState } from "react";

export default function Controls({
  stream,
  onLeave,
  onAudioToggle,
  isScreenSharing,
  onScreenShareToggle,
  handRaised,
  onRaiseHandToggle,
}) {
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const toggleAudio = () => {
    const track = stream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioOn(track.enabled);
      onAudioToggle?.(track.enabled);
    }
  };

  const toggleVideo = () => {
    const track = stream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoOn(track.enabled);
    }
  };

  return (
    <div className="controls-bar">
      <button className={`ctrl-btn ${!audioOn ? "off" : ""}`} onClick={toggleAudio}>
        {audioOn ? "🎤" : "🔇"}
      </button>
      <button className={`ctrl-btn ${!videoOn ? "off" : ""}`} onClick={toggleVideo}>
        {videoOn ? "📷" : "🚫"}
      </button>
      <button
        className={`ctrl-btn ${isScreenSharing ? "active" : ""}`}
        onClick={onScreenShareToggle}
        title="Share Screen"
      >
        🖥️
      </button>
      <button
        className={`ctrl-btn ${handRaised ? "active" : ""}`}
        onClick={onRaiseHandToggle}
        title="Raise Hand"
      >
        ✋
      </button>
      <button className="ctrl-btn leave" onClick={onLeave} title="Leave Call">
        📞
      </button>
    </div>
  );
}