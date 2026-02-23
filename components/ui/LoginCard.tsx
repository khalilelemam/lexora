import React from "react";
import Link from "next/link";

const LoginCard = () => {
  return (
    <div className="w-full max-w-md p-[1px] rounded-[32px] bg-gradient-to-b from-white/60 to-white/10 shadow-2xl shadow-slate-200/50">
      <div className="bg-white/80 backdrop-blur-3xl rounded-[31px] p-8 md:p-12 flex flex-col items-center">
        <h2 className="text-3xl font-black text-slate-800 mb-2">
          Welcome Back
        </h2>
        <p className="text-sm text-slate-500 mb-8 text-center font-medium">
          Sign in to access your Exia dashboard
        </p>

        {/* 1. Social Login */}
        <button className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm mb-6">
          <img src="google.jpg" className="w-4 h-4" alt="Google" />
          Continue with Google
        </button>

        {/* 2. Separator */}
        <div className="relative w-full py-4 mb-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-100"></span>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-white px-4 text-slate-400 font-black">
              Or continue with
            </span>
          </div>
        </div>

        {/* 3. Login Form */}
        <form className="w-full space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 ml-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium shadow-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400">
                Password
              </label>
              <Link
                href="#"
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium shadow-sm"
            />
          </div>
          <Link href="/">
            <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-4">
              Sign In
            </button>
          </Link>
        </form>

        <p className="mt-8 text-sm text-slate-500 font-medium">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-indigo-600 font-bold hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginCard;
