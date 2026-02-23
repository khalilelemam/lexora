import React from "react";

const Mission = () => {
  return (
    <section
      id="mission"
      className="w-full max-w-6xl mx-auto py-24 px-6 grid md:grid-cols-2 gap-12 items-center"
    >
      {/* Text Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-[2px] bg-pink-500" />
          <span className="text-pink-500 font-bold uppercase tracking-widest text-xs">
            Our Mission
          </span>
        </div>

        <h2 className="text-5xl md:text-6xl font-black text-slate-800 leading-tight">
          We don't fix people. <br />
          We find <span className="bg-cyan-100 px-2 rounded-lg">potential</span>
        </h2>

        <div className="space-y-6 text-lg text-slate-600 font-medium leading-relaxed">
          <p>
            Dyslexia is not a bug; it's a different operating system. 1 in 5
            people have it, including Einstein, Spielberg, and maybe you.
          </p>
          <p>
            Exia makes the invisible visible, turning confusion into clarity so
            every child can learn *their* way.
          </p>
        </div>
      </div>

      {/* Image Side (Halftone Styling) */}
      <div className="relative aspect-square bg-slate-200 rounded-[60px] overflow-hidden group">
        <img
          src="/eye.png"
          alt="Halftone eye illustration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[url('/eye-halftone.jpg')] bg-cover bg-center grayscale contrast-125 mix-blend-multiply" />
        {/* Subtle overlay to match the design's soft lighting */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/20 to-transparent" />
      </div>
    </section>
  );
};

export default Mission;
