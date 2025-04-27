
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
    // Determine appropriate data point spacing based on number of data points
    const totalPoints = data.length;
    let step = 1;
    
    // For larger datasets, skip points to avoid overcrowding
    if (totalPoints > 180) {
      step = Math.ceil(totalPoints / 180);
    } else if (totalPoints > 90) {
      step = Math.ceil(totalPoints / 90);
    } else if (totalPoints > 60) {
      step = Math.ceil(totalPoints / 60);
    }
    
    // Filter the data points based on the step
    return data.filter((_, index) => index % step === 0 || index === data.length - 1)
      .map(item => ({
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
              interval={chartData.length > 30 ? Math.ceil(chartData.length / 15) : 0}
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
