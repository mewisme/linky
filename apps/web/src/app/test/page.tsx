import { RankBadge } from "@repo/ui/mew/rank-badge";

export default function TestPage() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="plastic" tier="I" />
        <RankBadge rank="plastic" tier="II" />
        <RankBadge rank="plastic" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="bronze" tier="I" />
        <RankBadge rank="bronze" tier="II" />
        <RankBadge rank="bronze" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="silver" tier="I" />
        <RankBadge rank="silver" tier="II" />
        <RankBadge rank="silver" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="gold" tier="I" />
        <RankBadge rank="gold" tier="II" />
        <RankBadge rank="gold" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="platinum" tier="I" />
        <RankBadge rank="platinum" tier="II" />
        <RankBadge rank="platinum" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="diamond" tier="I" />
        <RankBadge rank="diamond" tier="II" />
        <RankBadge rank="diamond" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="immortal" tier="I" />
        <RankBadge rank="immortal" tier="II" />
        <RankBadge rank="immortal" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="ascendant" tier="I" />
        <RankBadge rank="ascendant" tier="II" />
        <RankBadge rank="ascendant" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="eternal" tier="I" />
        <RankBadge rank="eternal" tier="II" />
        <RankBadge rank="eternal" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="mythic" tier="I" />
        <RankBadge rank="mythic" tier="II" />
        <RankBadge rank="mythic" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="celestial" tier="I" />
        <RankBadge rank="celestial" tier="II" />
        <RankBadge rank="celestial" tier="III" />
      </div>
      <div className="flex flex-wrap gap-2">
        <RankBadge rank="transcendent" />
      </div>
    </div>
  )
}