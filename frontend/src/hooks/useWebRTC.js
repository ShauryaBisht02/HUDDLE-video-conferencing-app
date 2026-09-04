import { useRef, useState, useEffect, useCallback } from "react";
import { createSocket } from "../utils/socket";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC(roomId, userId, displayName, mode) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteMuteStatus, setRemoteMuteStatus] = useState({});
  const [messages, setMessages] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState({});
  const [participantNames, setParticipantNames] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isHost, setIsHost] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [currentMode, setCurrentMode] = useState("open");
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const cameraStreamRef = useRef(null);

  const createPeerConnection = useCallback((targetId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          target: targetId,
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [targetId]: event.streams[0] }));
    };

    peersRef.current[targetId] = pc;
    return pc;
  }, []);

  const sendToAll = useCallback((payload) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ ...payload, broadcast: true }));
    }
  }, []);

  const notifyMuteStatus = useCallback((audioOn) => {
    sendToAll({ type: "mute-status", audioOn, sender: userId });
  }, [sendToAll, userId]);

  const sendChatMessage = useCallback((text) => {
    const msg = { type: "chat", text, sender: userId, timestamp: Date.now() };
    sendToAll(msg);
    setMessages((prev) => [...prev, { ...msg, isLocal: true }]);
  }, [sendToAll, userId]);

  const toggleRaiseHand = useCallback((isRaised) => {
    sendToAll({ type: "raise-hand", isRaised, sender: userId });
  }, [sendToAll, userId]);

  const admitUser = useCallback((targetUserId) => {
    socketRef.current?.send(JSON.stringify({ type: "admit", target: targetUserId }));
    setJoinRequests((prev) => prev.filter((r) => r.user_id !== targetUserId));
  }, []);

  const rejectUser = useCallback((targetUserId) => {
    socketRef.current?.send(JSON.stringify({ type: "reject", target: targetUserId }));
    setJoinRequests((prev) => prev.filter((r) => r.user_id !== targetUserId));
  }, []);

  const setRoomMode = useCallback((newMode) => {
    socketRef.current?.send(JSON.stringify({ type: "set-mode", mode: newMode }));
    setCurrentMode(newMode);
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      setLocalStream((prev) => {
        const audioTrack = prev.getAudioTracks()[0];
        const combined = new MediaStream([screenTrack, ...(audioTrack ? [audioTrack] : [])]);
        return combined;
      });

      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    const camStream = cameraStreamRef.current;
    if (!camStream) return;

    const camVideoTrack = camStream.getVideoTracks()[0];
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(camVideoTrack);
    });

    setLocalStream(camStream);
    setIsScreenSharing(false);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        cameraStreamRef.current = stream;
        setLocalStream(stream);

        const socket = createSocket(
          roomId,
          userId,
          async (msg) => {
            if (msg.type === "admitted") {
              setConnectionStatus("admitted");
              setIsHost(!!msg.isHost);
            }
            if (msg.type === "waiting") {
              setConnectionStatus("waiting");
            }
            if (msg.type === "rejected") {
              setConnectionStatus("rejected");
            }
            if (msg.type === "join-request") {
              setJoinRequests((prev) => [...prev, { user_id: msg.user_id, name: msg.name }]);
            }
            if (msg.type === "user-joined") {
              const pc = createPeerConnection(msg.user_id, stream);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.send(JSON.stringify({ type: "offer", target: msg.user_id, offer }));
              socket.send(JSON.stringify({
                type: "name-announce", name: displayName, target: msg.user_id, sender: userId,
              }));
            }
            if (msg.type === "offer") {
              const pc = createPeerConnection(msg.sender, stream);
              await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.send(JSON.stringify({ type: "answer", target: msg.sender, answer }));
            }
            if (msg.type === "answer") {
              const pc = peersRef.current[msg.sender];
              await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
            }
            if (msg.type === "ice-candidate") {
              const pc = peersRef.current[msg.sender];
              if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            if (msg.type === "mute-status") {
              setRemoteMuteStatus((prev) => ({ ...prev, [msg.sender]: msg.audioOn }));
            }
            if (msg.type === "chat") {
              setMessages((prev) => [...prev, { ...msg, isLocal: false }]);
            }
            if (msg.type === "raise-hand") {
              setRaisedHands((prev) => ({ ...prev, [msg.sender]: msg.isRaised }));
            }
            if (msg.type === "name-announce") {
              setParticipantNames((prev) => ({ ...prev, [msg.sender]: msg.name }));
            }
            if (msg.type === "user-left") {
              setRemoteStreams((prev) => {
                const copy = { ...prev };
                delete copy[msg.user_id];
                return copy;
              });
              setRemoteMuteStatus((prev) => {
                const copy = { ...prev };
                delete copy[msg.user_id];
                return copy;
              });
              setRaisedHands((prev) => {
                const copy = { ...prev };
                delete copy[msg.user_id];
                return copy;
              });
              setParticipantNames((prev) => {
                const copy = { ...prev };
                delete copy[msg.user_id];
                return copy;
              });
              setJoinRequests((prev) => prev.filter((r) => r.user_id !== msg.user_id));
              delete peersRef.current[msg.user_id];
            }
          },
          { mode: mode || "open", name: displayName }
        );

        socketRef.current = socket;
      });

    return () => {
      socketRef.current?.close();
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, [roomId, userId, createPeerConnection]);

  return {
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
  };
}