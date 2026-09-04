import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useWebRTC } from "../hooks/useWebRTC";
import VideoTile from "./VideoTile";
import Controls from "./Controls";
import ChatPanel from "./ChatPanel";
import PreJoinLobby from "./PreJoinLobby";

function generateRoomCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const part = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

export default function VideoRoom() {
  const { roomIdParam } = useParams();
  const navigate = useNavigate();

  const [stage, setStage] = useState(roomIdParam ? "lobby" : "join");
  const [roomId, setRoomId] = useState(roomIdParam || "");
  const [userId] = useState(() => "user-" + Math.floor(Math.random() * 10000));
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [localVideoOn, setLocalVideoOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pinnedId, setPinnedId] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [localHandRaised, setLocalHandRaised] = useState(false);
  const [myName, setMyName] = useState("");
  const [roomMode, setRoomModeInit] = useState("open");

  const {
    localStream,
    remoteStreams,
    remoteMuteStatus,
    notifyMuteStatus,
    messages,
    sendChatMessage,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    raisedHands,
    toggleRaiseHand,
    participantNames,
    connectionStatus,
    isHost,
    joinRequests,
    admitUser,
    rejectUser,
    currentMode,
    setRoomMode,
  } = useWebRTC(stage === "call" ? roomId : null, userId, myName, roomMode);

  const handleLeave = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setStage("join");
    setPinnedId(null);
    setLocalHandRaised(false);
    navigate("/");
  };

  const handleAudioToggle = (audioOn) => {
    setLocalAudioOn(audioOn);
    notifyMuteStatus(audioOn);
  };

  const handleScreenShareToggle = () => {
    isScreenSharing ? stopScreenShare() : startScreenShare();
  };

  const handleRaiseHandToggle = () => {
    const newState = !localHandRaised;
    setLocalHandRaised(newState);
    toggleRaiseHand(newState);
  };

  const handleLobbyJoin = (audioOn, videoOn, name, mode) => {
    setLocalAudioOn(audioOn);
    setLocalVideoOn(videoOn);
    setMyName(name);
    setRoomModeInit(mode);
    setStage("call");
    navigate(`/room/${roomId}`);
  };

  const handleGoToLobby = () => {
    if (!roomId) return;
    navigate(`/room/${roomId}`);
    setStage("lobby");
  };

  const copyLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Stage 1: Join screen ----
  if (stage === "join") {
    return (
      <div className="join-screen">
        <div className="join-card">
          <div className="join-logo">◉</div>
          <h1>Huddle</h1>
          <p>Every conversation matters</p>

          <input
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGoToLobby()}
          />

          <button className="generate-btn" onClick={() => setRoomId(generateRoomCode())}>
            🎲 Generate Room Code
          </button>

          <button className="join-btn" onClick={handleGoToLobby}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ---- Stage 2: Pre-join lobby ----
  if (stage === "lobby") {
    return (
      <PreJoinLobby
        roomId={roomId}
        onJoin={handleLobbyJoin}
        onBack={() => {
          setStage("join");
          navigate("/");
        }}
      />
    );
  }

  // ---- Stage 3a: Waiting for host approval ----
  if (stage === "call" && connectionStatus === "waiting") {
    return (
      <div className="lobby-screen">
        <div className="lobby-card waiting-card">
          <div className="waiting-spinner">⏳</div>
          <h2>Waiting for host</h2>
          <p className="lobby-room-id">The host will let you in shortly...</p>
          <button className="lobby-back-btn" onClick={handleLeave}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- Stage 3b: Rejected ----
  if (stage === "call" && connectionStatus === "rejected") {
    return (
      <div className="lobby-screen">
        <div className="lobby-card waiting-card">
          <div className="waiting-spinner">🚫</div>
          <h2>Request denied</h2>
          <p className="lobby-room-id">The host didn't admit you to this room.</p>
          <button className="lobby-back-btn" onClick={handleLeave}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ---- Stage 3c: Still connecting ----
  if (stage === "call" && connectionStatus === "connecting") {
    return (
      <div className="lobby-screen">
        <div className="lobby-card waiting-card">
          <div className="waiting-spinner">🔄</div>
          <h2>Connecting...</h2>
        </div>
      </div>
    );
  }

  // ---- Stage 3d: Actual call (admitted) ----
  const participantCount = Object.keys(remoteStreams).length + 1;

  return (
    <div className="room-screen">
      <div className="room-topbar">
        <span className="room-id">
          Room: {roomId} {isHost && <span className="host-tag">👑 Host</span>}
        </span>
        <div className="topbar-actions">
          <button className="copy-link-btn" onClick={copyLink}>
            {copied ? "✅ Copied!" : "🔗 Copy Link"}
          </button>
          <button className="copy-link-btn" onClick={() => setShowQR(!showQR)}>
            📱 QR Code
          </button>
        </div>
        <span className="participant-count">👥 {participantCount}</span>
      </div>

      {isHost && (
        <div className="host-mode-banner">
          <span>👑 Room access:</span>
          <div className="mode-switch">
            <button
              className={`mode-switch-btn ${currentMode === "open" ? "active" : ""}`}
              onClick={() => setRoomMode("open")}
            >
              🌐 Open
            </button>
            <button
              className={`mode-switch-btn ${currentMode === "private" ? "active" : ""}`}
              onClick={() => setRoomMode("private")}
            >
              🔒 Private
            </button>
          </div>
        </div>
      )}

      {isHost && joinRequests.length > 0 && (
        <div className="join-requests-panel">
          {joinRequests.map((req) => (
            <div key={req.user_id} className="join-request-card">
              <span>🔔 <strong>{req.name}</strong> wants to join</span>
              <div className="join-request-actions">
                <button className="admit-btn" onClick={() => admitUser(req.user_id)}>
                  Admit
                </button>
                <button className="reject-btn" onClick={() => rejectUser(req.user_id)}>
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showQR && (
        <div className="qr-overlay" onClick={() => setShowQR(false)}>
          <div className="qr-card" onClick={(e) => e.stopPropagation()}>
            <h3>Scan to join</h3>
            <QRCodeSVG value={`${window.location.origin}/room/${roomId}`} size={220} />
            <p className="qr-room-id">{roomId}</p>
            <button className="lobby-back-btn" onClick={() => setShowQR(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div
        className={`video-grid ${
          pinnedId ? "spotlight-mode" : `count-${Math.min(participantCount, 6)}`
        }`}
      >
        {localStream && (
          <VideoTile
            stream={localStream}
            label={`${myName} (You)`}
            isLocal
            audioOn={localAudioOn}
            isPinned={pinnedId === "local"}
            onPin={() => setPinnedId(pinnedId === "local" ? null : "local")}
            handRaised={localHandRaised}
          />
        )}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <VideoTile
            key={id}
            stream={stream}
            label={participantNames[id] || "Joining..."}
            isLocal={false}
            audioOn={remoteMuteStatus[id] !== false}
            isPinned={pinnedId === id}
            onPin={() => setPinnedId(pinnedId === id ? null : id)}
            handRaised={raisedHands[id]}
          />
        ))}
      </div>

      <Controls
        stream={localStream}
        onLeave={handleLeave}
        onAudioToggle={handleAudioToggle}
        isScreenSharing={isScreenSharing}
        onScreenShareToggle={handleScreenShareToggle}
        handRaised={localHandRaised}
        onRaiseHandToggle={handleRaiseHandToggle}
      />
      <ChatPanel messages={messages} onSend={sendChatMessage} participantNames={participantNames} />
    </div>
  );
}