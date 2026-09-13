import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getStoredToken, getStoredUser, getSelectedRegion } from "../src/storage/auth-storage";
import { LoadingView } from "../src/components/LoadingView";

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
    return <LoadingView />;
  }

  return <Redirect href={destination} />;
}
