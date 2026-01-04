import { SessionProvider } from "@/context/SessionProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import '@/lib/crypto-shim';
import { Stack } from "expo-router";
import React from 'react';

export default function RootLayout() {
  React.useEffect(() => {
    let mod: any;
    try {
      mod = require('expo-screen-capture');
    } catch {
      return;
    }

    mod?.preventScreenCaptureAsync?.();
    return () => {
      mod?.allowScreenCaptureAsync?.();
    };
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </ThemeProvider>
  );
}
