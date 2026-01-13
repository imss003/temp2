import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import Reimbursement from "./Pages/Reimbursement";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* <Route path="/reimbursement" element={<Reimbursement />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
