import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getStoredToken, getStoredUser, getSelectedRegion } from "../src/storage/auth-storage";
import { LoadingView } from "../src/components/LoadingView";

type Destination = "loading" | "/login" | "/region-select" | "/categories" | "/reservations";

/**
 * Entry route: figures out where to send the user before anything else
 * renders. Company owners skip region selection (they don't need one to
 * manage their own incoming reservations) and land straight on the
 * 예약관리 tab — see app/(tabs)/reservations.tsx and app/(tabs)/_layout.tsx
 * for how that same tab slot renders their business view instead of a
 * customer's booking list. They can still reach 홈 to browse/book like any
 * customer; picking a region only happens lazily if they tap into it.
 */
export default function Index() {
  const [destination, setDestination] = useState<Destination>("loading");

  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (!token) {
          setDestination("/login");
          return;
        }

        const user = await getStoredUser();
        if (user?.role === "COMPANY") {
          setDestination("/reservations");
          return;
        }

        const region = await getSelectedRegion();
        setDestination(region ? "/categories" : "/region-select");
      } catch (err) {
        // Whatever went wrong reading local storage, never leave the user
        // stuck on the loading spinner forever — a release build shows no
        // error screen here, so a silent throw in this effect previously
        // meant setDestination() never ran again.
        console.error("Index routing failed:", err);
        setDestination("/login");
      }
    })();
  }, []);

  if (destination === "loading") {
    return <LoadingView />;
  }

  return <Redirect href={destination} />;
}
