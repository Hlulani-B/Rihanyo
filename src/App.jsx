import { useState } from 'react'
import reactLogo from './assets/react.svg'
import {BrowserRouter,Route,Routes} from "react-router-dom"
import Login from './components/login'
import PracticeDashboard from './components/practices'
import RejectedDashboard from './components/rejected'
import NewRequestsDashboard from './components/new_requests'
import AdminDashboard from './components/dashboard'
function App() {
 
  return (
    <>
     
     <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/practice"  element={<PracticeDashboard/>}/>
        <Route path="/rejected"  element={<RejectedDashboard/>}/>
         <Route path="/new_requests"  element={<NewRequestsDashboard/>}/>
          <Route path="/dashboard"  element={<AdminDashboard/>}/>

        
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App

