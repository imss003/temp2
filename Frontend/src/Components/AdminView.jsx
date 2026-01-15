import { useState, useEffect } from "react";
import api from "../api";
import RequestTable from "./RequestTable";
import { EXPENSE_CATEGORIES } from "../constants";

export default function AdminView({ data }) {
  const [activeTab, setActiveTab] = useState("stats");
  const [users, setUsers] = useState([]);
  const [policies, setPolicies] = useState([]);

  // State for adding a new user
  const [newUser, setNewUser] = useState({
    emp_id: "",
    name: "",
    password: "",
    role: "employee",
    manager_id: "",
  });

  // State for adding a new policy
  const [policyForm, setPolicyForm] = useState({
    category: "",
    amount_limit: "",
    description: "",
  });

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "policies") fetchPolicies();
  }, [activeTab]);

  const fetchUsers = () =>
    api.get("/admin/users").then((res) => setUsers(res.data));
  const fetchPolicies = () =>
    api.get("/policies").then((res) => setPolicies(res.data));

  const addUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newUser.name,
        role: newUser.role,
        emp_id: parseInt(newUser.emp_id),
        // If role is high-level, backend sets manager to 1.
        // If employee, use input. If empty, send null.
        password: newUser.password,
        manager_id: newUser.manager_id ? parseInt(newUser.manager_id) : null,
      };

      await api.post("/admin/user", payload);

      setNewUser({
        emp_id: "",
        name: "",
        role: "employee",
        password: "",
        manager_id: "",
      });
      fetchUsers();
      alert("User added successfully!");
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      const message =
        typeof errorDetail === "object"
          ? JSON.stringify(errorDetail)
          : errorDetail;

      alert("Failed to add user: " + (message || "Unknown Error"));
    }
  };

  const deleteUser = async (id) => {
    if (id === 1) return;
    if (
      window.confirm(
        `Are you sure you want to remove User #${id} and all their requests?`
      )
    ) {
      try {
        await api.delete(`/admin/user/${id}`);
        // Re-fetch the list from the server to update the UI
        await fetchUsers();
        alert("User deleted successfully");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert(
          "Error deleting user: " + err.response?.data?.detail ||
            "Check console"
        );
      }
    }
  };

  const savePolicy = async (e) => {
    e.preventDefault();
    await api.post("/admin/policy", policyForm);
    setPolicyForm({ category: "", amount_limit: "", description: "" });
    fetchPolicies();
  };

  // Helper: Find manager name based on ID
  const getManagerInfo = (managerId) => {
    if (!managerId) return null;
    if (managerId === 1) return { name: "System Owner", emp_id: 1 };
    const manager = users.find((u) => u.emp_id === managerId);
    return manager ? manager : { name: "Unknown", emp_id: managerId };
  };

  // Check if current role selection requires auto-manager
  const isAutoManagerRole = ["manager", "finance", "audit"].includes(
    newUser.role
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-slate-200 p-1 rounded-xl w-fit shadow-inner">
        {["stats", "users", "policies"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              activeTab === t
                ? "bg-white text-blue-600 shadow-md"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* --- STATS TAB --- */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              val={data.stats.total_users}
              color="text-blue-600"
            />
            <StatCard
              label="Total Requests"
              val={data.stats.total_requests}
              color="text-slate-800"
            />
            <StatCard
              label="Pending"
              val={data.stats.pending}
              color="text-amber-600"
            />
            <StatCard
              label="Paid"
              val={data.stats.paid}
              color="text-emerald-600"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">
              Global Request Logs
            </h3>
            <RequestTable requests={data.all_requests} />
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === "users" && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Add New Employee</h3>
          <form
            onSubmit={addUser}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8"
          >
            <input
              className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Emp ID"
              type="number"
              required
              value={newUser.emp_id}
              onChange={(e) =>
                setNewUser({ ...newUser, emp_id: e.target.value })
              }
            />
            <input
              className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full Name"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              type="password"
              required
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />
            <select
              className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.role}
              onChange={(e) =>
                setNewUser({ ...newUser, role: e.target.value, manager_id: "" })
              }
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="finance">Finance</option>
              <option value="audit">Audit</option>
              <option value="admin">Admin</option>
            </select>

            {/* Manager Input - Disabled if Auto-assigned role */}
            <div className="relative">
              <input
                className={`w-full border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  isAutoManagerRole ? "bg-gray-100 text-gray-400" : ""
                }`}
                placeholder={
                  isAutoManagerRole ? "Auto-assigned to Admin" : "Manager ID"
                }
                type="number"
                disabled={isAutoManagerRole}
                value={newUser.manager_id}
                onChange={(e) =>
                  setNewUser({ ...newUser, manager_id: e.target.value })
                }
              />
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
              Create User
            </button>
          </form>

          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b">
                <th className="p-4">Employee ID</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Role</th>
                {/* NEW COLUMN */}
                <th className="p-4">Reporting To</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const manager = getManagerInfo(u.manager_id);
                return (
                  <tr
                    key={u.emp_id}
                    className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-blue-600">
                      #{u.emp_id}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{u.name}</div>
                      {u.emp_id === 1 && (
                        <span className="text-[10px] text-orange-500 font-bold uppercase">
                          System Owner
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-black uppercase shadow-sm ${
                          u.role === "admin"
                            ? "bg-slate-800 text-white"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* MANAGER COLUMN DATA */}
                    <td className="p-4">
                      {manager ? (
                        <div className="leading-tight">
                          <div className="text-sm font-semibold text-gray-700">
                            {manager.name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            ID: {manager.emp_id}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">
                          No Manager
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {u.emp_id !== 1 ? (
                        <button
                          onClick={() => deleteUser(u.emp_id)}
                          className="text-red-500 hover:text-red-700 font-bold text-xs underline"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs italic">
                          Protected
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- POLICIES TAB --- */}
      {activeTab === "policies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form
            onSubmit={savePolicy}
            className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 h-fit"
          >
            <h3 className="font-bold text-slate-800">New Category Limit</h3>
            <select
              required
              className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={policyForm.category}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, category: e.target.value })
              }
            >
              <option value="">Select Category</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              className="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              type="number"
              placeholder="Limit Amount (₹)"
              required
              value={policyForm.amount_limit}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, amount_limit: e.target.value })
              }
            />
            <button className="w-full bg-slate-800 hover:bg-black text-white py-3 rounded-xl font-bold transition-all">
              Save Policy
            </button>
          </form>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {policies.length === 0 && (
              <p className="text-slate-400 text-sm italic">
                No policies defined yet.
              </p>
            )}
            {policies.map((p) => (
              <div
                key={p.id}
                className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center border-l-4 border-l-blue-500"
              >
                <div>
                  <p className="font-black text-slate-800 uppercase text-xs tracking-widest">
                    {p.category}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Global Limit Applied
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-blue-600">
                    ₹{p.amount_limit}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">
                    Per Request
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl border shadow-sm transition-transform hover:scale-[1.02]">
      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-3xl font-black ${color}`}>{val}</p>
    </div>
  );
}
