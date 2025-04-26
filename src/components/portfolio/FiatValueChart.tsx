
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
}

export function FiatValueChart({ data, title = "Unrealized Gains/Losses", height = 300 }: FiatValueChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item.fiatValue,
      gain: item.fiatGain
    }));
  }, [data]);

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
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
              width={60}
            />
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, "USD"]}
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
