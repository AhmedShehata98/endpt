import { useEffect, useState } from "react";

export function useCollapsedSidebar(): boolean {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1280,
  );

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return collapsed;
}
