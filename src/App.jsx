import RihanyoLanding from "./landing";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./patient/signin";
import Chat from "./patient/chat";
import Login from "./admin/components/login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RihanyoLanding />} />
        <Route path="/patient/signin" element={<SignIn />} />
        <Route path="/chat" element={<Chat/>} />

      </Routes>
    </BrowserRouter>
  );
}