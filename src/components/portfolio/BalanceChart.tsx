
import { useMemo } from "react";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceHistoryItem } from "@/types/utxo";
import { formatBTC } from "@/utils/utxo-utils";

interface BalanceChartProps {
  data: BalanceHistoryItem[];
  title?: string;
  height?: number;
}

export function BalanceChart({ data, title = "BTC Balance Over Time", height = 300 }: BalanceChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      btc: item.balance,
      fiat: item.fiatValue
    }));
  }, [data]);

  // Format large BTC numbers (for Y-axis display)
  const formatYAxisTick = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else if (value >= 100) {
      return value.toFixed(1);
    } else if (value >= 1) {
      return value.toFixed(2);
    }
    return value.toFixed(4);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBtc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F7931A" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              minTickGap={10}
            />
            <YAxis 
              tickFormatter={(value) => formatYAxisTick(value)}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              width={40}
            />
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <Tooltip 
              formatter={(value: number) => [formatBTC(value), "BTC"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="btc" 
              stroke="#F7931A" 
              fillOpacity={1} 
              fill="url(#colorBtc)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
