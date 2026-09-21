import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type HomeAudienceCardProps = {
  title: string;
  text: string;
  icon: LucideIcon;
  selected?: boolean;
  controlsId?: string;
  onToggle?: () => void;
};

export function HomeAudienceCard({
  title,
  text,
  icon: Icon,
  selected = false,
  controlsId,
  onToggle
}: HomeAudienceCardProps) {
  return (
    <button
      type="button"
      className={cn("audience-path", selected && "is-selected")}
      aria-expanded={selected}
      aria-controls={controlsId}
      onClick={onToggle}
    >
      <span className="audience-path-icon">
        <Icon aria-hidden="true" size={20} strokeWidth={2.1} />
      </span>
      <strong className="audience-path-title">{title}</strong>
      <span className="audience-path-text">{text}</span>
    </button>
  );
}
