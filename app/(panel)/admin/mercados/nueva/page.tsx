import { MarketEditor } from "@/modules/markets/markets-client";
import { Toaster } from "@/components/ui/sonner";

export default function Page() {
  return <><MarketEditor/><Toaster position="bottom-right" richColors/></>;
}
