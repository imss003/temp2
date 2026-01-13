import { useNavigate } from "react-router-dom";

export default function Topbar({ name, role }) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-end items-center bg-white h-16 px-8 shadow-sm border-b border-gray-100">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}