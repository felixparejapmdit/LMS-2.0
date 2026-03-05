import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import "./index.css";

// --- Global API Interceptor for Graceful Error Handling ---
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the server responded with an Internal Server Error (500)
    if (error.response && error.response.status >= 500) {
      console.error("Intercepted 500+", error.response.data);
      triggerToast("The server is temporarily busy. Please try again later.");
    } else if (error.code === 'ERR_NETWORK') {
      triggerToast("Network error. Unable to connect to the server.");
    }

    // Always return a rejected promise so the calling code handles its loading states
    return Promise.reject(error);
  }
);

// Fallback DOM-based Toast Notification
const triggerToast = (message) => {
  // Prevent duplicate toasts
  if (document.getElementById('global-error-toast')) return;

  const toast = document.createElement("div");
  toast.id = "global-error-toast";
  toast.className = "fixed bottom-5 right-5 z-[9999] px-5 py-4 bg-white dark:bg-[#111] border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-[1.2rem] shadow-2xl flex items-center gap-4 transition-all duration-500 transform translate-y-20 opacity-0";

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <span class="leading-relaxed text-slate-700 dark:text-slate-300 mr-2">${message}</span>
  `;

  document.body.appendChild(toast);

  // Trigger animation in
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });

  // Out animation after 5 seconds
  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 5000);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
