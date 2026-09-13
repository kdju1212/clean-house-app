import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getStoredToken, getStoredUser, getSelectedRegion } from "../src/storage/auth-storage";

type Destination = "loading" | "/login" | "/region-select" | "/categories" | "/company";

/**
 * Entry route: figures out where to send the user before anything else
 * renders. Company owners skip region selection entirely (they don't
 * browse by region, they manage their own listing) and land straight on
 * their dashboard; customers go through the region -> category flow.
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

      const user = await getStoredUser();
      if (user?.role === "COMPANY") {
        setDestination("/company");
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
