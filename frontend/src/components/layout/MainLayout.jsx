import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../common/Header";
import { Sidebar } from "../common/Sidebar";
import { FloatingAIChatWidget } from "../common/FloatingAIChatWidget";

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. FIXED ARTISTIC GYM BACKGROUND */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-fixed z-0 opacity-20 scale-105 transition-transform duration-1000"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070')`
        }}
      />

      {/* 2. LUXURY DARK GRADIENT OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-slate-950/90 via-slate-950/85 to-slate-950/95 backdrop-blur-[1px] z-0" />

      {/* 3. AMBIENT ROYAL OCEAN BLUE & CYAN GLOW ORBS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-blue-600/20 via-cyan-500/10 to-transparent blur-[120px] opacity-70"></div>
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-10 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] opacity-60"></div>
      </div>

      <Header />

      <div className="flex-1 flex w-full relative z-10 px-3 sm:px-5 lg:px-7 py-5 gap-4 lg:gap-5">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Floating AI Assistant Chat Widget */}
      <FloatingAIChatWidget />
    </div>
  );
};


