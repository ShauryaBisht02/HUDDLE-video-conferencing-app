import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VideoRoom from "./components/VideoRoom";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoRoom />} />
        <Route path="/room/:roomIdParam" element={<VideoRoom />} />
      </Routes>
    </BrowserRouter>
  );
}