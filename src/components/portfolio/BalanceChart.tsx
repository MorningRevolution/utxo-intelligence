
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
import { format, isWithinInterval, subDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceHistoryItem } from "@/types/utxo";
import { formatBTC } from "@/utils/utxo-utils";

interface BalanceChartProps {
  data: BalanceHistoryItem[];
  title?: string;
  height?: number;
  timeFilter: '30d' | '90d' | '1y' | 'all' | '2023' | '2024';
}

export function BalanceChart({ 
  data, 
  title = "BTC Balance Over Time", 
  height = 300,
  timeFilter 
}: BalanceChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const filteredData = data.filter(item => {
      const itemDate = parseISO(item.date);
      
      switch (timeFilter) {
        case '30d':
          return isWithinInterval(itemDate, {
            start: subDays(now, 30),
            end: now
          });
        case '90d':
          return isWithinInterval(itemDate, {
            start: subDays(now, 90),
            end: now
          });
        case '1y':
          return isWithinInterval(itemDate, {
            start: subDays(now, 365),
            end: now
          });
        case '2024':
          return itemDate.getFullYear() === 2024;
        case '2023':
          return itemDate.getFullYear() === 2023;
        case 'all':
          return true;
        default:
          return true;
      }
    });

    // Determine appropriate data point spacing
    const totalPoints = filteredData.length;
    let step = 1;
    
    if (totalPoints > 180) {
      step = Math.ceil(totalPoints / 180);
    } else if (totalPoints > 90) {
      step = Math.ceil(totalPoints / 90);
    } else if (totalPoints > 60) {
      step = Math.ceil(totalPoints / 60);
    }
    
    return filteredData
      .filter((_, index) => index % step === 0 || index === filteredData.length - 1)
      .map(item => ({
        date: format(parseISO(item.date), 'MMM d'),
        btc: item.balance
      }));
  }, [data, timeFilter]);

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
