import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Topbar({ name, role }) {
  const navigate = useNavigate();
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to fetch policies from backend
  const handleViewPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/policies");
      setPolicies(res.data || []);
      setShowPolicyModal(true);
    } catch (err) {
      console.error("Failed to fetch policies", err);
      alert("Could not load policies at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-between items-center bg-white h-16 px-8 shadow-sm border-b border-gray-100 sticky top-0 z-40">
      {/* Policy Button - Aligned to Left */}
      <button
        onClick={handleViewPolicies}
        disabled={loading}
        className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-200"
      >
        {loading ? (
          <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          "📜"
        )}
        View Company Policies
      </button>

      {/* User Actions Area - Aligned to the Right */}
      <div className="flex items-center gap-6">
        {/* User Info Label */}
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-gray-900 leading-none">
            {name || "User Name"}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 mt-1 px-2 py-0.5 bg-blue-50 rounded">
            {role || "Employee"}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>

        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
          className="flex items-center gap-2 bg-transparent hover:bg-red-50 text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>

      {/* --- POLICY MODAL OVERLAY --- */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Expense Policy Limits</h3>
                <p className="text-sm text-slate-500">Maximum allowed amount per reimbursement request</p>
              </div>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase font-black text-slate-400 tracking-widest border-b">
                    <th className="pb-3 px-2">Category</th>
                    <th className="pb-3 px-2">Limit Amount</th>
                    <th className="pb-3 px-2">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policies.length > 0 ? (
                    policies.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-2 font-bold text-slate-800 text-sm">
                          {p.category}
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-blue-600 font-extrabold text-lg">
                            ₹{new Intl.NumberFormat('en-IN').format(p.amount_limit)}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-100">
                            ACTIVE POLICY
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-12 text-center text-slate-400 italic">
                        No specific policies defined by Admin yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="bg-slate-900 hover:bg-black text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}