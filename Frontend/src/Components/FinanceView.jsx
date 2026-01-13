import api from "../api";
import RequestTable from "./RequestTable";

export default function FinanceView({ requests }) {
  
  const handleAction = async (id, action) => {
  try {
    let endpoint = "";
    if (action === "approve") endpoint = `/finance/approve/${id}`;
    else if (action === "reject") endpoint = `/finance/reject/${id}`;
    else endpoint = `/finance/pay/${id}`; // This matches the new backend route

    await api.put(endpoint);
    window.location.reload();
  } catch (err) {
    // Show the actual error message from the backend
    const errorMsg = err.response?.data?.detail || "Action failed";
    console.error("Finance Error:", err);
    alert("Finance Error: " + errorMsg);
  }
};

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Finance Approval Queue</h2>
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
          {requests.length} Pending Actions
        </span>
      </div>

      <RequestTable
        requests={requests}
        actions={(r) => (
          <div className="flex justify-end gap-2">
            {/* If it's a Manager's direct request, show Approve/Reject */}
            {r.status === "Awaiting Finance" ? (
              <>
                <button
                  onClick={() => handleAction(r.req_id, "approve")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Approve & Pay
                </button>
                <button
                  onClick={() => handleAction(r.req_id, "reject")}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Reject
                </button>
              </>
            ) : (
              /* If it's an Employee request already approved by a manager, just show Pay */
              <button
                onClick={() => handleAction(r.req_id, "pay")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                Release Payment
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}