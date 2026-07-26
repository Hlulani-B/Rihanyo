import RihanyoLanding from "./landing";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./patient/signin";
import Chat from "./patient/chat";
import Login from "./admin/components/login";
import Practicedashboard from './patient/practices'
import PracticeDashboard from './admin/components/practices'
import RejectedDashboard from './admin/components/rejected'
import NewRequestsDashboard from './admin/components/new_requests'
import AdminDashboard from './admin/components/dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RihanyoLanding />} />
        <Route path="/patient/signin" element={<SignIn />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/" element={<Login />} />
        <Route path="/practice"  element={<PracticeDashboard/>}/>
        <Route path="/practices"  element={<Practicedashboard/>}/>
        <Route path="/rejected"  element={<RejectedDashboard/>}/>
         <Route path="/new_requests"  element={<NewRequestsDashboard/>}/>
          <Route path="/dashboard"  element={<AdminDashboard/>}/>

      </Routes>
    </BrowserRouter>
  );
}