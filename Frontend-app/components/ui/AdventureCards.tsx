import Link from "next/link";
import React from "react";

const AdventureCards = () => {
  return (
    <section id="adventure" className="w-full max-w-6xl mx-auto py-20 px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-800 mb-4">
          Choose your adventure
        </h2>
        <p className="text-slate-500 font-medium">
          Whether you are a curious parent or a specialized clinic.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Exia Home */}
        <div className="relative bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/40 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase px-3 py-1 rounded-full absolute top-6 right-8">
              Most Popular
            </span>
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-6 text-2xl">
              🏠
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-4">
              Exia Home
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Curious? Get a preliminary reading map in 5 minutes using just
              your laptop webcam.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <span className="bg-white/50 px-4 py-2 rounded-full text-xs font-bold text-slate-500 border border-white/20">
                ✓ No install needed
              </span>
              <span className="bg-white/50 px-4 py-2 rounded-full text-xs font-bold text-slate-500 border border-white/20">
                ✓ Instant Results
              </span>
            </div>
          </div>
          <Link href="/webcam">
            <button className="w-full bg-[#2d2d2d] text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
              Play in Browser <span>→</span>
            </button>
          </Link>
        </div>

        {/* Card 2: Exia Lab */}
        <div className="relative bg-[#2d2d2d] rounded-[32px] p-8 text-white flex flex-col justify-between shadow-xl">
          <div>
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-6 text-pink-400 border border-pink-500/30 text-2xl">
              🎯
            </div>
            <h3 className="text-3xl font-bold mb-4">Exia Lab</h3>
            <p className="text-slate-300 mb-8 leading-relaxed">
              For schools & clinics. High-frequency tracking for deep
              neurological analysis.
            </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <span className="text-emerald-400 text-lg">🔒</span> Offline &
                HIPAA Secure
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <span className="text-cyan-400 text-lg">📊</span> Clinical
                Report Generation
              </li>
            </ul>
          </div>
          <Link href="/eye_track">
            <button className="w-full bg-pink-400 hover:bg-pink-500 text-white py-4 rounded-2xl font-bold transition-all">
              Download Software
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AdventureCards;
