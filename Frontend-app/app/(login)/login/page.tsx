import React from "react";
import LoginCard from "@/components/ui/LoginCard";

const LoginPage = () => {
  return (
    <div className="relative min-h-screen">
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <LoginCard />
      </main>
    </div>
  );
};

export default LoginPage;
