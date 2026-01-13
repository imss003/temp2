import { useEffect, useState } from "react";
import Sidebar from "../Components/Sidebar.jsx";
import Topbar from "../Components/Topbar";
import api from "../api";

export default function Reimbursement() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    expense_type: "",
    amount: "",
    date: "",
    description: "",
    receipt: null,
  });

  const emp_id = localStorage.getItem("emp_id");

  useEffect(() => {
    api.get(`/employee/${emp_id}/expenses`).then((res) => {
      setRequests(res.data);
    });
  }, [emp_id]);

  const submit = async () => {
    const data = new FormData();
    data.append("expense_type", form.expense_type);
    data.append("amount", form.amount);
    data.append("date", form.date);
    data.append("description", form.description);
    data.append("emp_id", emp_id);
    data.append("file", form.receipt);

    await api.post("/employee/expense", data);
    window.location.reload();
  };

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1">
        <Topbar />

        <div className="p-8">
          <h1 className="text-2xl font-semibold mb-6">
            Reimbursement
          </h1>

          {/* Form */}
          <div className="bg-white p-6 rounded shadow mb-10 max-w-3xl">
            <h2 className="font-semibold mb-4">
              Expense Reimbursement Request
            </h2>

            <select
              className="border p-2 w-full mb-4"
              onChange={(e) =>
                setForm({ ...form, expense_type: e.target.value })
              }
            >
              <option>Select type</option>
              <option>Travel</option>
              <option>Meals</option>
              <option>Office</option>
            </select>

            <input
              type="number"
              placeholder="Amount"
              className="border p-2 w-full mb-4"
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
            />

            <input
              type="date"
              className="border p-2 w-full mb-4"
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <textarea
              placeholder="Description"
              className="border p-2 w-full mb-4"
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <input
              type="file"
              className="mb-4"
              onChange={(e) =>
                setForm({ ...form, receipt: e.target.files[0] })
              }
            />

            <button
              onClick={submit}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              Submit
            </button>
          </div>

          {/* Table */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="font-semibold mb-4">
              My Reimbursement Requests
            </h2>

            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">REQ-{r.id}</td>
                    <td className="p-2">{r.expense_type}</td>
                    <td className="p-2">₹{r.amount}</td>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          r.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
