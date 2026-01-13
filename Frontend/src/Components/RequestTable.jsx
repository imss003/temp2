export default function RequestTable({ requests, actions }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-700 border-green-200";
      case "Manager Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-left bg-white">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 font-semibold text-gray-600">ID</th>
            <th className="p-4 font-semibold text-gray-600">Category</th>
            <th className="p-4 font-semibold text-gray-600">Description</th>
            <th className="p-4 font-semibold text-gray-600">Status</th>
            <th className="p-4 font-semibold text-gray-600">Proof</th>
            <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests?.map((r) => (
            <tr key={r.req_id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4 font-medium text-gray-900">#{r.req_id}</td>
              <td className="p-4 text-gray-700">{r.category}</td>
              <td className="p-4 text-gray-600 text-sm max-w-xs truncate">{r.description}</td>
              <td className="p-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(r.status)}`}>
                  {r.status}
                </span>
              </td>
              <td className="p-4">
                {r.image_path && (
                  <a href={r.image_path} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">
                    View Attachment
                  </a>
                )}
              </td>
              <td className="p-4 text-right">
                {actions && actions(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}