import { useState, useEffect } from "react";
import api from "../api";
import RequestTable from "./RequestTable";
import imageCompression from "browser-image-compression";
import { EXPENSE_CATEGORIES } from "../constants";

export default function EmployeeView({ requests }) {
  // 1. Added 'amount' to the form state
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    file: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [policies, setPolicies] = useState([]);

  // 2. State for the dropdown categories
  const [categories, setCategories] = useState([]);

  // 3. Fetch Policies on load to populate the Dropdown
  useEffect(() => {
    // ... inside your useEffect
    const fetchPolicies = async () => {
      try {
        const res = await api.get("/policies");
        setPolicies(res.data || []);
        // You can keep setCategories if you use it elsewhere,
        // but policies is what your JSX logic relies on.
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load policies/categories");
      }
    };
    fetchPolicies();
  }, []);

  // 1. Find the policy for the category selected in the dropdown
  const activePolicy = policies.find((p) => p.category === form.category);

  // 2. Determine if the current amount exceeds that policy's limit
  const isOverLimit =
    activePolicy &&
    form.amount !== "" &&
    parseFloat(form.amount) > activePolicy.amount_limit;

  const submit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      if (editingId) {
        // --- Logic for Update ---
        // Backend expects: category, description, amount
        await api.put(`/request/${editingId}`, {
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount), // Ensure it's a number
        });
      } else {
        // --- Logic for Create ---
        const data = new FormData();
        data.append("emp_id", localStorage.getItem("emp_id")); // or however you store ID
        data.append("category", form.category);
        data.append("description", form.description);
        data.append("amount", form.amount); // Added Amount

        // Only compress and attach if user selected a file
        if (form.file) {
          data.append("file", form.file); // The key MUST match the backend 'file: Optional[UploadFile]'
        }

        await api.post("/request", data);
      }
      alert(editingId ? "Updated!" : "Submitted!");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.detail || "Server Error";
      alert("Error: " + (typeof msg === "object" ? JSON.stringify(msg) : msg));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteReq = async (id) => {
    if (window.confirm("Delete this request?")) {
      try {
        await api.delete(`/request/${id}`);
        window.location.reload();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  const startEdit = (r) => {
    setEditingId(r.req_id);
    // 4. Populate existing values including amount
    setForm({
      category: r.category,
      description: r.description,
      amount: r.amount,
      file: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {editingId ? "✏️ Edit Request" : "➕ New Request"}
        </h2>
        <form
          onSubmit={submit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* --- Dropdown for Category --- */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">
              Category
            </label>
            <select
              value={form.category}
              required
              className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select a Category</option>
              {EXPENSE_CATEGORIES.map((cat) => {
                const policy = policies.find((p) => p.category === cat);
                return (
                  <option key={cat} value={cat}>
                    {cat}{" "}
                    {policy
                      ? `(Limit: ₹${policy.amount_limit})`
                      : "(No Limit Set)"}
                  </option>
                );
              })}
            </select>
          </div>

          {/* --- Input for Amount --- */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              required
              className={`border p-3 rounded-xl outline-none transition-all ${
                isOverLimit
                  ? "border-red-500 bg-red-50 focus:ring-red-500"
                  : "focus:ring-blue-500 border-black"
              }`}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            {/* --- THE WARNING LABEL --- */}
            {isOverLimit && (
              <p className="text-red-600 text-xs mt-1.5 font-bold flex items-center gap-1 animate-pulse">
                <span>⚠️</span> This exceeds the ₹{activePolicy.amount_limit}{" "}
                category limit.
              </p>
            )}
          </div>

          {/* File Input */}
          {!editingId && (
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-600 mb-1">
                Receipt Image
              </label>
              <input
                type="file"
                accept="image/*"
                className="block w-full border p-2.5 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
              />
            </div>
          )}

          {/* Description */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              required
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all"
              placeholder="Please provide details about this expense..."
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={isUploading}
              className={`${
                isUploading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              } text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200`}
            >
              {isUploading
                ? "Uploading..."
                : editingId
                ? "Update Request"
                : "Submit Request"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    category: "",
                    description: "",
                    amount: "",
                    file: null,
                  });
                }}
                className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          My Recent Requests
        </h2>
        <RequestTable
          requests={requests}
          actions={(r) =>
            r.status === "Pending" && (
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => startEdit(r)}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm underline underline-offset-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteReq(r.req_id)}
                  className="text-red-500 hover:text-red-700 font-bold text-sm underline underline-offset-4"
                >
                  Delete
                </button>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
