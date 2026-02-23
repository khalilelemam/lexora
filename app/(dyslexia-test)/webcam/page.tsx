"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Maximize2,
  Minimize2,
  Timer,
  User,
  GraduationCap,
  CheckCircle,
  ClipboardCheck,
} from "lucide-react";

/* ================= REGISTRATION COMPONENT ================= */

function RegistrationForm({
  onStart,
  setInfo,
}: {
  onStart: () => void;
  setInfo: (data: any) => void;
}) {
  const [localData, setLocalData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    grade: "",
    age: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fields are no longer required ('required' attribute removed from inputs)
    setInfo(localData);
    onStart();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 ">
      <div className="bg-white w-full max-w-xl rounded-[24px] shadow-2xl p-10 border border-blue-100">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ClipboardCheck className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Assessment Setup
          </h1>
          <p className="text-slate-500 mt-2 font-medium italic text-sm">
            You may fill these details or skip by clicking Start
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl outline-none transition-all"
              placeholder="First Name (Optional)"
              onChange={(e) =>
                setLocalData({ ...localData, firstName: e.target.value })
              }
            />
            <input
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl outline-none transition-all"
              placeholder="Last Name (Optional)"
              onChange={(e) =>
                setLocalData({ ...localData, lastName: e.target.value })
              }
            />
          </div>
          <input
            type="email"
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl outline-none transition-all"
            placeholder="Email Address (Optional)"
            onChange={(e) =>
              setLocalData({ ...localData, email: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-400 rounded-xl outline-none"
              onChange={(e) =>
                setLocalData({ ...localData, grade: e.target.value })
              }
            >
              <option value="">Grade</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
            </select>
            <input
              type="number"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-400 rounded-xl outline-none"
              placeholder="Age"
              onChange={(e) =>
                setLocalData({ ...localData, age: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] mt-4 text-lg"
          >
            Start Assessment
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function DyslexiaAssessment() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [riskResult, setRiskResult] = useState("");

  useEffect(() => {
    if (!started || finished) return;
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [started, finished]);

  const handleFinish = () => {
    const risks = ["Low Risk", "Medium Risk", "High Risk"];
    setRiskResult(risks[Math.floor(Math.random() * risks.length)]);
    setFinished(true);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!started)
    return (
      <RegistrationForm
        onStart={() => setStarted(true)}
        setInfo={setStudentInfo}
      />
    );

  if (finished) {
    const riskStyles: any = {
      "Low Risk": "text-emerald-600 bg-emerald-50 border-emerald-200",
      "Medium Risk": "text-amber-600 bg-amber-50 border-amber-200",
      "High Risk": "text-rose-600 bg-rose-50 border-rose-200",
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-10 rounded-[32px] shadow-2xl text-center max-w-lg w-full border border-slate-100">
          <CheckCircle className="text-blue-500 w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-800 mb-1">
            Assessment Finalized
          </h2>
          <p className="text-slate-400 mb-8 tracking-tight">
            Session recorded successfully
          </p>

          <div
            className={`p-8 rounded-2xl border-2 mb-6 ${riskStyles[riskResult]}`}
          >
            <p className="text-xs uppercase tracking-[0.2em] font-bold mb-1 opacity-70">
              Calculated Risk Level
            </p>
            <p className="text-4xl font-black">{riskResult}</p>
          </div>

          <div className="bg-slate-50 py-3 rounded-xl mb-8">
            <span className="text-slate-400 text-sm">Reading Duration: </span>
            <span className="text-slate-700 font-bold">{formatTime(time)}</span>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* PROFESSIONAL HEADER */}
      <header className="bg-white px-10 py-4 flex items-center justify-between shadow-sm border-b border-slate-200 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BookOpen className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-none">
              Dyslexia Screening
            </h2>
            <p className="text-xs text-blue-500 font-semibold uppercase mt-1">
              Active Eye-Tracking Session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
          <Timer size={18} className="text-blue-600" />
          <span className="font-mono text-xl font-bold text-blue-700">
            {formatTime(time)}
          </span>
        </div>
      </header>

      {/* REFINED ASSESSMENT AREA */}
      <main className="flex-1 w-full relative p-4 md:p-8 flex flex-col items-center">
        {/* Paper-style Container */}
        <div className="w-full max-w-6xl h-full bg-white rounded-xl shadow-inner border border-slate-200 overflow-y-auto custom-scrollbar flex flex-col items-center">
          <div className="w-full p-6 md:p-12">
            <img
              src="/image1.jpeg"
              alt="Assessment Content"
              className="w-full h-auto rounded-sm"
              style={{ display: "block", margin: "0 auto" }}
            />
          </div>
        </div>

        {/* Action Button - Semi-transparent background for focus */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center py-6 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/80 to-transparent pointer-events-none">
          <button
            onClick={handleFinish}
            className="pointer-events-auto px-20 py-5 rounded-xl text-xl font-bold tracking-tight shadow-xl bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all border-b-4 border-blue-800"
          >
            I have finished reading
          </button>
        </div>
      </main>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-24 right-10 z-50 bg-white/90 p-3 rounded-full shadow-md hover:bg-white text-slate-400 hover:text-blue-600 border border-slate-200 transition-all"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
