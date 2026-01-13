import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch whoever is in the database
    api.get("/admin/users")
      .then((res) => {
        setProfiles(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogin = (id) => {
    localStorage.setItem("emp_id", id);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-black text-center mb-6 text-gray-800 tracking-tight">
          PORTAL ACCESS
        </h1>
        
        {loading ? (
          <div className="text-center py-4 text-gray-400 animate-pulse">Checking database...</div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <button
                key={p.emp_id}
                onClick={() => handleLogin(p.emp_id)}
                className="w-full p-4 text-left border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center group"
              >
                <div>
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-[10px] uppercase font-black text-blue-500">{p.role}</p>
                </div>
                <span className="text-gray-300 group-hover:text-blue-500">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}