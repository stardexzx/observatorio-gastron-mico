import { MarketsManager } from "@/modules/markets/markets-client";
import { Toaster } from "@/components/ui/sonner";

export default function Page() {
  return <><MarketsManager/><Toaster position="bottom-right" richColors/></>;
}
