import { cn } from "@ws/ui/lib/utils"
import { Badge } from "@ws/ui/components/ui/badge"
import { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

export const rankBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-[4px] border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all select-none",
  {
    variants: {
      rank: {
        plastic:
          "bg-stone-950/50 border-[#57534E] text-[#A8A29E]",
        bronze:
          "bg-[#2C1810]/80 border-[#9A3412] text-[#F97316]",
        silver:
          "bg-[#1E293B]/80 border-[#64748B] text-[#E2E8F0]",
        gold:
          "bg-[#422006]/60 border-[#CA8A04] text-[#FDE047] shadow-[0_0_10px_-4px_rgba(202,138,4,0.4)]",

        platinum:
          "bg-[#083344]/60 border-[#06B6D4] text-[#67E8F9] shadow-[0_0_12px_-4px_#06B6D4]",
        diamond:
          "bg-[#172554]/60 border-[#3B82F6] text-[#93C5FD] shadow-[0_0_12px_-4px_#3B82F6]",
        immortal:
          "bg-[#4C0519]/60 border-[#E11D48] text-[#FDA4AF] shadow-[0_0_15px_-4px_#E11D48]",
        ascendant:
          "bg-[#022C22]/60 border-[#10B981] text-[#6EE7B7] shadow-[0_0_15px_-4px_#10B981]",
        eternal:
          "bg-[#2E1065]/60 border-[#8B5CF6] text-[#C4B5FD] shadow-[0_0_15px_-4px_#8B5CF6]",

        mythic:
          "bg-gradient-to-r from-[#701a75]/40 to-[#831843]/40 border-[#D946EF] text-[#F0ABFC] shadow-[0_0_20px_-5px_#D946EF]",
        celestial:
          "bg-gradient-to-r from-[#1e1b4b]/60 to-[#312e81]/60 border-[#6366F1] text-[#A5B4FC] shadow-[0_0_20px_-5px_#6366F1]",

        transcendent:
          "border-white/80 bg-white text-black shadow-[0_0_25px_-5px_rgba(255,255,255,0.8)] animate-in zoom-in duration-500",
      },

      tier: {
        I: "opacity-60 saturate-50",
        II: "opacity-80 saturate-100",
        III: "opacity-100 brightness-110 shadow-sm",
        none: "",
      },
    },

    compoundVariants: [
      { rank: "transcendent", tier: ["I", "II", "III"], className: "opacity-100 saturate-100 brightness-100" },
      { rank: ["plastic", "bronze", "silver"], className: "border-[1px]" },
      { rank: ["immortal", "ascendant", "eternal", "mythic", "celestial"], className: "border-[1.5px]" },
    ],

    defaultVariants: {
      rank: "plastic",
      tier: "I",
    },
  }
)

export type RankBadgeVariants = VariantProps<typeof rankBadgeVariants>
export type RankBadgeProps = ComponentProps<typeof Badge> & RankBadgeVariants

export const RankBadge = ({ rank, tier, className, ...props }: RankBadgeProps) => {
  const renderTier = () => {
    if (!tier || tier === "none") return null;
    if (rank === "transcendent") return null;
    return (
      <span className="ml-2 flex items-center border-l border-current pl-2 opacity-80">
        {tier}
      </span>
    );
  };

  return (
    <Badge
      variant="outline"
      className={cn(rankBadgeVariants({ rank, tier }), className)}
      {...props}
    >
      <span className="flex items-center">
        {rank}
        {renderTier()}
      </span>
    </Badge>
  )
}