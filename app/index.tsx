import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getStoredToken } from "../src/storage/auth-storage";

/**
 * Entry route: figures out whether there's already a saved session (from a
 * previous Kakao login) and redirects accordingly, before anything else
 * renders — same job the web's session cookie check does implicitly on
 * every page load.
 */
export default function Index() {
  const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");

  useEffect(() => {
    getStoredToken().then((token) => setStatus(token ? "authed" : "guest"));
  }, []);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={status === "authed" ? "/home" : "/login"} />;
}
