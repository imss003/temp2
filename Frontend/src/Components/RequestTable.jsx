export default function RequestTable({ requests, actions }) {
  // 1. Helper to format currency (Rupees)
  const formatMoney = (amount) => {
    if (amount === undefined || amount === null) return "₹0.00"; 
    return new Intl.NumberFormat('en-IN', { // Changed to Indian locale
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-700 border-green-200";
      case "Manager Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
      <table className="w-full text-left bg-white">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 font-semibold text-gray-600">ID</th>
            <th className="p-4 font-semibold text-gray-600">Category</th>
            <th className="p-4 font-semibold text-gray-600">Description</th>
            {/* AMOUNT COLUMN */}
            <th className="p-4 font-semibold text-gray-600">Amount</th>
            <th className="p-4 font-semibold text-gray-600">Status</th>
            <th className="p-4 font-semibold text-gray-600">Proof</th>
            <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests && requests.length > 0 ? (
            requests.map((r) => (
              <tr key={r.req_id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">#{r.req_id}</td>
                <td className="p-4 text-gray-700">
                  <span className="bg-slate-100 px-2 py-1 rounded text-sm font-medium text-slate-600">
                    {r.category}
                  </span>
                </td>
                <td className="p-4 text-gray-600 text-sm max-w-xs truncate" title={r.description}>
                  {r.description}
                </td>
                
                {/* AMOUNT DATA CELL (Now shows ₹) */}
                <td className="p-4 font-bold text-gray-800">
                  {formatMoney(r.amount)}
                </td>

                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4">
                  {r.image_path ? (
                    <a 
                      href={r.image_path} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold flex items-center gap-1"
                    >
                      📎 Attachment
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs italic">None</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {actions && actions(r)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="p-8 text-center text-gray-400 italic bg-gray-50">
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}