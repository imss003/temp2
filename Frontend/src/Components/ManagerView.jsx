import { useState } from "react";
import api from "../api";
import RequestTable from "./RequestTable";
import EmployeeView from "./EmployeeView";

/**
 * ManagerView handles both Team management and Personal requests.
 * @param {Array} teamRequests - Requests from employees reporting to this manager.
 * @param {Array} myRequests - Requests submitted by the manager themselves.
 */
export default function ManagerView({ teamRequests = [], myRequests = [] }) {
  const [activeTab, setActiveTab] = useState("team");

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
      {/* Modern Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("team")}
          className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "team"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Team Requests ({teamRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("personal")}
          className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "personal"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Personal Requests
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* --- Team Management View --- */}
      {activeTab === "team" && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Team Queue</h2>
            <span className="text-sm text-gray-500">
              Review and act on pending team submissions
            </span>
          </div>
          
          <RequestTable
            requests={teamRequests}
            actions={(r) =>
              r.status === "Pending" ? (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => approve(r.req_id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(r.req_id)}
                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">No actions available</span>
              )
            }
          />
          
          {teamRequests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">Your team has no active requests.</p>
            </div>
          )}
        </div>
      )}

      {/* --- Personal View --- */}
      {activeTab === "personal" && (
        <div className="animate-fadeIn">
          {/* We reuse EmployeeView which contains the Create Form and the Personal Table */}
          <EmployeeView requests={myRequests} />
        </div>
      )}
    </div>
  );
}