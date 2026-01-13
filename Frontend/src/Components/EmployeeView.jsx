import { useState } from "react";
import api from "../api";
import RequestTable from "./RequestTable";
import imageCompression from "browser-image-compression";

export default function EmployeeView({ requests }) {
  const [form, setForm] = useState({ category: "", description: "", file: null });
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      if (editingId) {
        // Logic for Update: Send JSON
        await api.put(`/request/${editingId}`, { 
          category: form.category, 
          description: form.description 
        });
      } else {
        // Logic for Create: Send FormData
        const data = new FormData();
        data.append("emp_id", localStorage.getItem("emp_id"));
        data.append("category", form.category);
        data.append("description", form.description);

        // OPTIONAL: Only compress and attach if user selected a file
        if (form.file) {
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
          const compressedFile = await imageCompression(form.file, options);
          data.append("file", compressedFile);
        }

        await api.post("/request", data);
      }
      alert(editingId ? "Updated!" : "Submitted!");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.detail || "Server Error";
      alert("Error: " + (typeof msg === 'object' ? JSON.stringify(msg) : msg));
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
    setForm({ category: r.category, description: r.description, file: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {editingId ? "✏️ Edit Request" : "➕ New Request"}
        </h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={form.category}
            required
            className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Category (e.g. Travel, Food)"
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          
          {/* File Input: Removed 'required' attribute */}
          {!editingId && (
            <input
              type="file"
              accept="image/*"
              className="border p-2.5 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
            />
          )}

          <textarea
            value={form.description}
            required
            className="border p-3 rounded-xl md:col-span-2 focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all"
            placeholder="Please provide details about this expense..."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={isUploading}
              className={`${isUploading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200`}
            >
              {isUploading ? "Uploading..." : (editingId ? "Update Request" : "Submit Request")}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => { setEditingId(null); setForm({category:"", description:"", file:null}); }} 
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
        <h2 className="text-xl font-bold mb-4 text-slate-800">My Recent Requests</h2>
        <RequestTable 
          requests={requests} 
          actions={(r) => r.status === "Pending" && (
            <div className="flex justify-end gap-4">
              <button onClick={() => startEdit(r)} className="text-blue-600 hover:text-blue-800 font-bold text-sm underline underline-offset-4">Edit</button>
              <button onClick={() => deleteReq(r.req_id)} className="text-red-500 hover:text-red-700 font-bold text-sm underline underline-offset-4">Delete</button>
            </div>
          )}
        />
      </div>
    </div>
  );
}