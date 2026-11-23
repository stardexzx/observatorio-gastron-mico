import { MarketEditor } from "@/modules/markets/markets-client";
import { Toaster } from "@/components/ui/sonner";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  return <><MarketEditor id={(await params).id}/><Toaster position="bottom-right" richColors/></>;
}
