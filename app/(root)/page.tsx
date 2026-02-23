import React from "react";
import Hero from "@/components/ui/Hero";
import AdventureCards from "@/components/ui/AdventureCards";
import Mission from "@/components/ui/Mission";

const Page = () => {
  return (
    <div className="relative">
      <main className="flex flex-col items-center">
        <Hero />
        <AdventureCards />
        <Mission />
      </main>
    </div>
  );
};

export default Page;
