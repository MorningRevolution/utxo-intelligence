
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

interface FiatValueChartProps {
  data: BalanceHistoryItem[];
  title?: string;
  height?: number;
  currencySymbol?: string;
  timeFilter: '30d' | '90d' | '1y' | 'all' | '2023' | '2024';
}

export function FiatValueChart({ 
  data, 
  title = "Unrealized Gains/Losses", 
  height = 300,
  currencySymbol = "USD",
  timeFilter
}: FiatValueChartProps) {
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
        value: item.fiatValue,
        gain: item.fiatGain
      }));
  }, [data, timeFilter]);

  // Calculate the appropriate interval for X-axis ticks based on data points and timeFilter
  const getTickInterval = () => {
    if (chartData.length <= 6) return 0; // Show all ticks for small datasets
    
    switch(timeFilter) {
      case '30d':
        return Math.ceil(chartData.length / 6); // ~6 ticks for 30 days
      case '90d':
        return Math.ceil(chartData.length / 8); // ~8 ticks for 90 days
      case '1y':
        return Math.ceil(chartData.length / 12); // ~12 ticks for a year
      case '2023':
      case '2024':
        return Math.ceil(chartData.length / 12); // ~12 ticks for a year
      case 'all':
        return Math.ceil(chartData.length / 10); // ~10 ticks for all time
      default:
        return Math.ceil(chartData.length / 8);
    }
  };

  // Format Y-axis tick values for better readability
  const formatYAxisTick = (value: number) => {
    if (value === 0) return "0";
    
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toFixed(0);
    }
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
              interval={getTickInterval()}
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
