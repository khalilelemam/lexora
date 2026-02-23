export const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#fbfcfe]">
      {/* This creates the subtle dot grid seen in your design */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Blurred Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-[120px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-pink-200/30 blur-[120px]" />
      <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-purple-100/50 blur-[100px]" />
    </div>
  );
};
