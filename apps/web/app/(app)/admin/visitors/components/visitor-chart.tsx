'use client'

import { useIsMobile } from '@repo/ui/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  RechartsPrimitive,
  type ChartConfig,
} from '@repo/ui/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@repo/ui/components/ui/toggle-group'

type ChartItem = {
  date: string
  visitors: number
  pageViews: number
}

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--primary)',
  },
  pageViews: {
    label: 'Page Views',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

interface VisitorChartProps {
  setDays: (days: number) => void
  days: number
  data?: ChartItem[]
}

export function VisitorChart({ setDays, days, data = [] }: VisitorChartProps) {
  const isMobile = useIsMobile()

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Visitors</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={days.toString()}
            onValueChange={(value) => setDays(Number(value))}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <RechartsPrimitive.AreaChart data={data} accessibilityLayer style={{ outline: 'none', ring: 'none' }}>
            <defs>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-visitors)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-visitors)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-pageViews)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-pageViews)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <RechartsPrimitive.CartesianGrid vertical={false} />
            <RechartsPrimitive.XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />

            <RechartsPrimitive.Area
              style={{ outline: 'none' }}
              dataKey="visitors"
              type="natural"
              fill="url(#fillVisitors)"
              fillOpacity={0.4}
              stroke="var(--color-visitors)"
              stackId="a"
            />
            <RechartsPrimitive.Area
              style={{ outline: 'none' }}
              dataKey="pageViews"
              type="natural"
              fill="url(#fillPageViews)"
              fillOpacity={0.4}
              stroke="var(--color-pageViews)"
              stackId="a"
            />
            <ChartTooltip
              cursor={true}
              content={
                <ChartTooltipContent
                  defaultIndex={isMobile ? -1 : 10}
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
          </RechartsPrimitive.AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}