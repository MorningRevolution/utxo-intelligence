
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

interface FiatValueChartProps {
  data: BalanceHistoryItem[];
  title?: string;
  height?: number;
  currencySymbol?: string;
}

export function FiatValueChart({ 
  data, 
  title = "Unrealized Gains/Losses", 
  height = 300,
  currencySymbol = "USD"
}: FiatValueChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item.fiatValue,
      gain: item.fiatGain
    }));
  }, [data]);

  // Format large numbers (e.g. $20,000 -> $20K)
  const formatYAxisTick = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
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
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
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
              width={60}
            />
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <Tooltip 
              formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, currencySymbol]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="gain" 
              stroke="#10B981" 
              fillOpacity={0.5} 
              fill="url(#colorGain)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
