import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Reaches 1");
    if (!username || !password) {
      setError("Please enter name and password");
      return;
    }
    console.log("Reaches 2");
    try {
      const res = await api.post("/login", {
        name: username,
        password: password,
      });
      console.log(res);
      localStorage.setItem("emp_id", res.data.emp_id);

      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      console.log("Reaches here")
      login(res.data); // save user in context
      navigate("/dashboard"); // ONLY ROUTE
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm space-y-4"
      >
        <h2 className="text-2xl font-black text-center text-slate-800">
          Expense Management
        </h2>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm p-2 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-bold text-slate-600">Name</label>
          <input
            className="w-full border p-2 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-600">Password</label>
          <input
            className="w-full border p-2 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
        >
          Login
        </button>
      </form>
    </div>
  );
}
