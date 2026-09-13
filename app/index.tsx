import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getStoredToken, getSelectedRegion } from "../src/storage/auth-storage";

type Destination = "loading" | "/login" | "/region-select" | "/categories";

/**
 * Entry route: figures out where to send the user before anything else
 * renders — no session -> /login, session but no saved region -> pick one,
 * otherwise straight to the category list. Same job the web's session
 * cookie + REGION_COOKIE checks do implicitly on every page load.
 */
export default function Index() {
  const [destination, setDestination] = useState<Destination>("loading");

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        setDestination("/login");
        return;
      }
      const region = await getSelectedRegion();
      setDestination(region ? "/categories" : "/region-select");
    })();
  }, []);

  if (destination === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
