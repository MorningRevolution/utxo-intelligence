
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagAllocation } from "@/types/utxo";
import { formatBTC } from "@/utils/utxo-utils";

interface TagAllocationChartProps {
  data: TagAllocation[];
  title?: string;
  height?: number;
}

export function TagAllocationChart({ data, title = "UTXO Allocation by Tag", height = 300 }: TagAllocationChartProps) {
  // Colors for the pie chart segments
  const COLORS = [
    '#F7931A', // Bitcoin orange
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#EF4444', // Red
  ];

  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.tag,
      value: item.amount,
      percentage: (item.percentage * 100).toFixed(1) + '%',
      fiatValue: item.fiatValue
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name}: ${percentage}`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatBTC(value), "Amount"]}
              labelFormatter={(name) => name}
            />
            <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
