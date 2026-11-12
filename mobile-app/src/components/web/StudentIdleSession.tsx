import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { authService } from "@/services/auth";
import { STUDENT_IDLE_KEY, STUDENT_IDLE_MS, startBrowserIdleSession } from "@/utils/browserIdle";

export function StudentIdleSession() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const session = useRef<ReturnType<typeof startBrowserIdleSession> | null>(null);

  useEffect(() => {
    const controller = startBrowserIdleSession({
      key: STUDENT_IDLE_KEY,
      timeout: STUDENT_IDLE_MS,
      countVideo: true,
      onWarning: setSeconds,
      onExpire: () => {
        setExpired(true);
        void authService.logout();
      },
    });
    session.current = controller;
    return () => controller.stop();
  }, []);

  return (
    <Modal visible={expired || seconds !== null} transparent animationType="none" onRequestClose={() => {}}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#0f172a80" }}>
        <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 420, padding: 24, borderRadius: 16, backgroundColor: "white" }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>{expired ? "Signing out" : "Still studying?"}</Text>
          {!expired && <>
            <Text style={{ marginTop: 8, color: "#475569" }}>Your session will end in {seconds} seconds due to inactivity.</Text>
            <Pressable accessibilityRole="button" onPress={() => session.current?.stay()}
              style={{ alignSelf: "flex-start", marginTop: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: "#0f172a" }}>
              <Text style={{ color: "white", fontWeight: "600" }}>Stay logged in</Text>
            </Pressable>
          </>}
        </View>
      </View>
    </Modal>
  );
}
