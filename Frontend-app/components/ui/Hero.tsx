import React from "react";

const Hero = () => {
  return (
    <section
      id="how-it-works"
      className="flex flex-col items-center justify-center pt-32 pb-20 px-4"
    >
      {/* 1. The Small Badge */}
      <div className="flex items-center gap-2 mb-8 bg-white/60 backdrop-blur-sm px-4 py-1 rounded-full border border-white/40 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs md:text-sm font-bold text-slate-600">
          New: At-home discovery kit
        </span>
      </div>

      {/* 2. The Hero Headline */}
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-black text-[#2d3748] tracking-tight leading-[1.1]">
          Reading is a <br />
          <span className="bg-gradient-to-r from-[#5eead4] to-[#22d3ee] bg-clip-text text-transparent">
            fingerprint
          </span>
        </h1>
        <p className="mt-8 max-w-2xl mx-auto text-base md:text-lg text-slate-500 font-medium leading-relaxed">
          We don't use scary tests. We play games. Exia maps your unique eye
          movements to uncover hidden reading superpowers.
        </p>
      </div>

      {/* 3. The "Fingerprint" Card (Simplified) */}
      <div className="relative mt-16 w-full max-w-4xl p-[1.5px] rounded-[40px] bg-gradient-to-r from-pink-200 via-purple-200 to-cyan-200 shadow-xl shadow-blue-100/20">
        <div className="bg-white/80 backdrop-blur-md rounded-[39px] p-10 md:p-20 text-center relative">
          {/* Static Design Element */}
          <div className="absolute top-6 right-10 flex items-center gap-1.5 opacity-40">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Visual Analysis Active
            </span>
          </div>

          <blockquote className="text-4xl md:text-6xl text-slate-800 font-serif leading-tight tracking-tight">
            “The quick brown fox jumps over the lazy dog.”
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default Hero;
