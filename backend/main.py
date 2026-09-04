from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://huddle-video-conferencing-app.vercel.app",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms: dict[str, dict[str, WebSocket]] = {}
room_host: dict[str, str] = {}
room_mode: dict[str, str] = {}  # "open" or "private"
pending: dict[str, dict[str, WebSocket]] = {}
empty_since: dict[str, float] = {}
ROOM_EXPIRY_SECONDS = 5 * 60


@app.get("/")
def health_check():
    return {"status": "signaling server running"}


@app.websocket("/ws/{room_id}/{user_id}")
async def signaling_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await websocket.accept()

    try:
        first_raw = await websocket.receive_text()
        first_msg = json.loads(first_raw)
    except Exception:
        await websocket.close()
        return

    name = first_msg.get("name", "Guest")
    is_new_room = room_id not in rooms and room_id not in room_host

    if is_new_room:
        room_host[room_id] = user_id
        room_mode[room_id] = "open"  # always starts open; host changes later
        rooms[room_id] = {user_id: websocket}
        empty_since.pop(room_id, None)
        await websocket.send_text(json.dumps({"type": "admitted", "isHost": True}))
        print(f"[HOST] {user_id} created room {room_id}")
    else:
        current_mode = room_mode.get(room_id, "open")
        if current_mode == "open" or user_id == room_host.get(room_id):
            rooms.setdefault(room_id, {})
            rooms[room_id][user_id] = websocket
            empty_since.pop(room_id, None)
            await websocket.send_text(json.dumps({"type": "admitted", "isHost": False}))
            await broadcast(room_id, {"type": "user-joined", "user_id": user_id}, exclude=user_id)
            print(f"[JOIN] {user_id} joined open room {room_id}")
        else:
            pending.setdefault(room_id, {})
            pending[room_id][user_id] = websocket
            host_id = room_host.get(room_id)
            host_ws = rooms.get(room_id, {}).get(host_id)
            if host_ws:
                await host_ws.send_text(json.dumps({
                    "type": "join-request", "user_id": user_id, "name": name
                }))
            await websocket.send_text(json.dumps({"type": "waiting"}))
            print(f"[WAIT] {user_id} waiting to join {room_id}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            if msg_type == "set-mode":
                if user_id == room_host.get(room_id):
                    new_mode = message.get("mode")
                    if new_mode in ("open", "private"):
                        room_mode[room_id] = new_mode
                        print(f"[MODE] Room {room_id} set to {new_mode} by host")
                continue

            if msg_type in ("admit", "reject"):
                target_id = message.get("target")
                target_ws = pending.get(room_id, {}).pop(target_id, None)
                if target_ws:
                    if msg_type == "admit":
                        rooms.setdefault(room_id, {})
                        rooms[room_id][target_id] = target_ws
                        await target_ws.send_text(json.dumps({"type": "admitted", "isHost": False}))
                        await broadcast(room_id, {"type": "user-joined", "user_id": target_id}, exclude=target_id)
                    else:
                        await target_ws.send_text(json.dumps({"type": "rejected"}))
                        await target_ws.close()
                continue

            if message.get("broadcast"):
                await broadcast(room_id, message, exclude=user_id)
                continue

            target_user = message.get("target")
            if target_user and target_user in rooms.get(room_id, {}):
                await rooms[room_id][target_user].send_text(json.dumps({
                    **message,
                    "sender": user_id
                }))

    except WebSocketDisconnect:
        print(f"[LEAVE] {user_id} left room {room_id}")
        if room_id in rooms and user_id in rooms[room_id]:
            del rooms[room_id][user_id]
        if room_id in pending and user_id in pending[room_id]:
            del pending[room_id][user_id]

        await broadcast(room_id, {"type": "user-left", "user_id": user_id}, exclude=user_id)

        if user_id == room_host.get(room_id):
            room_host.pop(room_id, None)

        if room_id in rooms and not rooms[room_id]:
            empty_since[room_id] = time.time()
            asyncio.create_task(schedule_room_cleanup(room_id))


async def schedule_room_cleanup(room_id: str):
    await asyncio.sleep(ROOM_EXPIRY_SECONDS)
    if room_id in rooms and not rooms[room_id] and room_id in empty_since:
        del rooms[room_id]
        empty_since.pop(room_id, None)
        room_host.pop(room_id, None)
        room_mode.pop(room_id, None)
        pending.pop(room_id, None)
        print(f"[EXPIRED] Room {room_id} deleted after {ROOM_EXPIRY_SECONDS}s of inactivity")


async def broadcast(room_id: str, message: dict, exclude: str = None):
    if room_id not in rooms:
        return
    for uid, ws in rooms[room_id].items():
        if uid != exclude:
            await ws.send_text(json.dumps(message))