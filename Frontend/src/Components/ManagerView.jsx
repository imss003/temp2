import { useState, useEffect } from "react";
import api from "../api";
import RequestTable from "./RequestTable";
import EmployeeView from "./EmployeeView";

/**
 * ManagerView handles Team management, Employee lists, and Personal requests.
 * @param {Object} currentUser - The logged-in manager's info (must contain emp_id).
 * @param {Array} teamRequests - Requests from employees reporting to this manager.
 * @param {Array} myRequests - Requests submitted by the manager themselves.
 */
export default function ManagerView({ currentUser, teamRequests = [], myRequests = [] }) {
  const [activeTab, setActiveTab] = useState("team");
  const [myTeam, setMyTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch Team Members when tab is active
  useEffect(() => {
    if (activeTab === "employees" && myTeam.length === 0) {
      const fetchTeam = async () => {
        try {
          setLoadingTeam(true);
          // Ensure currentUser has emp_id
          const id = currentUser?.emp_id || JSON.parse(localStorage.getItem("user"))?.emp_id;
          const res = await api.get(`/manager/team/${id}`);
          setMyTeam(res.data.team || []);
        } catch (err) {
          console.error("Failed to fetch team", err);
        } finally {
          setLoadingTeam(false);
        }
      };
      fetchTeam();
    }
  }, [activeTab, currentUser, myTeam.length]);

  // Actions for the Team Management table
  const approve = async (id) => {
    try {
      await api.put(`/manager/approve/${id}`);
      window.location.reload();
    } catch (err) {
      console.error("Approval failed", err);
      alert("Failed to approve request.");
    }
  };

  const reject = async (id) => {
    try {
      await api.put(`/manager/reject/${id}`);
      window.location.reload();
    } catch (err) {
      console.error("Rejection failed", err);
      alert("Failed to reject request.");
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Tab Navigation --- */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "team" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Team Requests ({teamRequests.length})
        </button>
        
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "employees" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Team
        </button>

        <button
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "personal" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Personal Requests
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* --- 1. Team Requests View --- */}
      {activeTab === "team" && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Team Queue</h2>
            <span className="text-sm text-gray-500">Pending submissions requiring approval</span>
          </div>
          
          <RequestTable
            requests={teamRequests}
            actions={(r) =>
              r.status === "Pending" ? (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => approve(r.req_id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(r.req_id)}
                    className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">No actions</span>
              )
            }
          />
          
          {teamRequests.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-400">No pending requests from your team.</p>
            </div>
          )}
        </div>
      )}

      {/* --- 2. My Team List View (New) --- */}
      {activeTab === "employees" && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Direct Reports</h2>
            <span className="text-sm text-gray-500">Employees reporting to you</span>
          </div>

          {loadingTeam ? (
            <div className="p-4 text-center text-gray-500">Loading team members...</div>
          ) : (
            <div className="overflow-hidden border rounded-xl shadow-sm bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emp ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myTeam.length > 0 ? (
                    myTeam.map((emp) => (
                      <tr key={emp.emp_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.emp_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{emp.role}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
                        No employees found under your supervision.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- 3. Personal View --- */}
      {activeTab === "personal" && (
        <div className="animate-fadeIn">
          <EmployeeView requests={myRequests} />
        </div>
      )}
    </div>
  );
}