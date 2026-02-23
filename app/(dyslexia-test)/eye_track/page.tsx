"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Maximize2,
  Minimize2,
  Timer,
  ClipboardCheck,
  CheckCircle,
  ChevronRight,
  ArrowRight,
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
    setInfo(localData);
    onStart();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 ">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl p-10 border border-blue-100">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <ClipboardCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Student Data
          </h1>
          <p className="text-slate-500 mt-2 font-medium italic text-sm">
            Enter details or click start to skip
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none transition-all"
              placeholder="First Name"
              onChange={(e) =>
                setLocalData({ ...localData, firstName: e.target.value })
              }
            />
            <input
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none transition-all"
              placeholder="Last Name"
              onChange={(e) =>
                setLocalData({ ...localData, lastName: e.target.value })
              }
            />
          </div>
          <input
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl outline-none transition-all"
            placeholder="Email Address"
            onChange={(e) =>
              setLocalData({ ...localData, email: e.target.value })
            }
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-[0.98] mt-4 text-xl flex items-center justify-center gap-2"
          >
            Start Test <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function PaginatedAssessment() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0, 1, or 2
  const [time, setTime] = useState(0);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [riskResult, setRiskResult] = useState("");

  const images = ["/image1.jpeg", "/image1.jpeg", "/image1.jpeg"];

  useEffect(() => {
    if (!started || finished) return;
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [started, finished]);

  const handleNext = () => {
    if (currentStep < images.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of image when switching
      document.getElementById("image-scroll-area")?.scrollTo(0, 0);
    } else {
      const risks = ["Low Risk", "Medium Risk", "High Risk"];
      setRiskResult(risks[Math.floor(Math.random() * risks.length)]);
      setFinished(true);
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
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f0f7ff]">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl text-center max-w-xl w-full border border-blue-50">
          <CheckCircle className="text-blue-500 w-20 h-20 mx-auto mb-6" />
          <h2 className="text-4xl font-black text-slate-800 mb-2">Success!</h2>
          <p className="text-slate-400 text-lg mb-8">
            All sections completed by {studentInfo?.firstName || "Student"}
          </p>

          <div className="p-10 rounded-[32px] border-4 border-blue-600 bg-blue-50 mb-8 text-blue-700">
            <p className="text-xs uppercase tracking-[0.3em] font-bold mb-2 opacity-60">
              Final Assessment
            </p>
            <p className="text-5xl font-black">{riskResult}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-xl hover:bg-black transition shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white px-10 py-5 flex items-center justify-between shadow-sm border-b border-blue-100 z-50">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg">
            <BookOpen className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-none">
              Reading Test
            </h2>
            <div className="flex gap-2 mt-2">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-8 rounded-full transition-all duration-300 ${idx === currentStep ? "bg-blue-600 w-12" : idx < currentStep ? "bg-blue-300" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 px-6 py-2.5 rounded-2xl border border-blue-100 flex items-center gap-3">
          <Timer size={20} className="text-blue-600" />
          <span className="font-mono text-2xl font-black text-blue-700">
            {formatTime(time)}
          </span>
        </div>
      </header>

      {/* PAGINATED IMAGE AREA */}
      <main className="flex-1 w-full relative flex flex-col items-center p-6 md:p-10">
        <div
          id="image-scroll-area"
          className="w-full max-w-6xl h-full bg-white rounded-[32px] shadow-2xl border border-blue-50 overflow-y-auto custom-scrollbar"
        >
          <div className="w-full p-8 md:p-16 flex flex-col items-center">
            <img
              src={images[currentStep]}
              alt={`Step ${currentStep + 1}`}
              className="w-full h-auto rounded-lg transition-opacity duration-500 animate-in fade-in slide-in-from-bottom-4"
            />
          </div>
        </div>

        {/* Action Button - Changes label based on step */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none">
          <button
            onClick={handleNext}
            className="pointer-events-auto px-20 py-6 rounded-full text-2xl font-black tracking-widest uppercase shadow-2xl bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border-4 border-white"
          >
            {currentStep < images.length - 1 ? (
              <>
                Next Page <ChevronRight size={28} />
              </>
            ) : (
              "Finish Test"
            )}
          </button>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
