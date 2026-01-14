import { useEffect, useState } from "react";
import api from "../api";

// Component Imports
import Topbar from "../Components/Topbar";
// import Sidebar from "../Components/Sidebar"; // Uncomment if you use it
import EmployeeView from "../Components/EmployeeView";
import ManagerView from "../Components/ManagerView";
import FinanceView from "../Components/FinanceView";
import AuditView from "../Components/AuditView";
import AdminView from "../Components/AdminView";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get ID from local storage
  const emp_id_raw = localStorage.getItem("emp_id");

  useEffect(() => {
    // 1. Safety Check: If no ID exists, stop immediately
    if (!emp_id_raw) {
      setError("No user ID found. Please login again.");
      setLoading(false);
      return;
    }

    // 2. Parse ID safely
    const emp_id = parseInt(emp_id_raw);
    if (isNaN(emp_id)) {
        setError("Invalid User ID format.");
        setLoading(false);
        return;
    }

    // 3. Fetch Data
    api.post("/dashboard", { emp_id: emp_id })
      .then((res) => {
        console.log("Dashboard Data Loaded:", res.data); // Debugging log
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error:", err);
        // Better error message handling
        const msg = err.response?.data?.detail || "Failed to connect to the server.";
        setError(msg);
        setLoading(false);
      });
  }, [emp_id_raw]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium italic">Loading your workspace...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-red-100">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">System Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => {
                localStorage.clear(); // Clear bad data
                window.location.href = "/";
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Layout ---
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      
      {/* <Sidebar role={data.role} /> */}

      <div className="flex-1 flex flex-col">
        <Topbar name={data.name} role={data.role} />

        <main className="p-8 overflow-y-auto">
          {/* Welcome Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Hello, {data.name}
            </h1>
            <p className="text-slate-500 font-medium">
              Here is what is happening with the system today.
            </p>
          </header>

          {/* Conditional Role-Based Views */}
          <div className="transition-all duration-500">
            {data.role === "employee" && (
              <EmployeeView requests={data.my_requests} />
            )}

            {data.role === "manager" && (
              <ManagerView 
                // FIX: Passed currentUser so ManagerView can fetch the team list
                currentUser={data} 
                teamRequests={data.team_requests} 
                myRequests={data.my_requests} 
              />
            )}

            {data.role === "finance" && (
              <FinanceView requests={data.finance_queue} />
            )}

            {data.role === "audit" && (
              <AuditView requests={data.all_requests} />
            )}

            {data.role === "admin" && (
              <AdminView data={data} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}