import React from "react";
import SignupCard from "@/components/ui/SignupCard";

const SignupPage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Centering the card over the background */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <SignupCard />
      </main>
    </div>
  );
};

export default SignupPage;
