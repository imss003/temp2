import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-60 bg-gray-100 h-screen p-4">
      <h2 className="text-xl font-semibold mb-6">🏠 Home</h2>

      <p className="font-semibold mb-2">💸 Reimbursement</p>
      <Link
        to="/reimbursement"
        className="block ml-4 text-gray-700 hover:text-blue-600"
      >
        • My Requests
      </Link>
    </div>
  );
}
