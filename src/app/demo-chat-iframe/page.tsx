import { DemoChatBubble } from "../demo/demo-chat-bubble";

export default function DemoChatIframePage({
  searchParams,
}: {
  searchParams: Promise<{ color?: string; business?: string }>;
}) {
  return (
    <div className="h-screen w-screen bg-white flex flex-col font-sans p-3">
      <iframe
        src="/demo"
        className="hidden"
      />
      <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
        <h3 className="font-bold text-sm text-[#101828]">Chat Widget Atiende</h3>
        <p className="text-xs text-[#667085] mt-1">Conectado con éxito a la aplicación.</p>
      </div>
    </div>
  );
}
