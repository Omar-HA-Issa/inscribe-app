import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Jan", value: 45000 },
  { month: "Feb", value: 52000 },
  { month: "Mar", value: 48000 },
  { month: "Apr", value: 61000 },
  { month: "May", value: 58000 },
  { month: "Jun", value: 67000 },
];

const segmentData = [
  { segment: "Enterprise", value: 45 },
  { segment: "SMB", value: 30 },
  { segment: "Retail", value: 15 },
  { segment: "Other", value: 10 },
];

const COLORS = ["hsl(var(--chart-cyan))", "hsl(var(--chart-azure))", "hsl(var(--chart-magenta))", "hsl(var(--muted))"];

export const Visuals = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-semibold mb-2 lowercase">visuals / data analysis</h2>
        <p className="text-muted-foreground">Chart-based insights and trends</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--chart-cyan))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-cyan))", r: 4 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Segment Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                animationDuration={800}
              >
                {segmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {segmentData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[i] }}
                />
                <span className="text-muted-foreground">{item.segment}</span>
                <span className="font-medium ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-card rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Quarterly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--chart-azure))"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
