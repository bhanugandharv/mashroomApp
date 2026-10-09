import { Megaphone } from "lucide-react";
import { useContent } from "@/context/ContentContext";

export default function AnnouncementBar() {
  const { content, c } = useContent();
  const text = c("announcement");
  if (!content.announcement_enabled || !text || text === "announcement") return null;
  return (
    <div data-testid="announcement-bar" className="bg-[#8B4513] text-center text-sm font-medium text-[#FDFBF7]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2"><Megaphone className="h-4 w-4 text-[#DAA520]" />{text}</div>
    </div>
  );
}
