import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const ResourceReports = () => {
  const { edirslug } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    fetchReportData();
  }, [edirslug, timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const data = await api.get(
        `${edirslug}/resource-reports/?time_range=${timeRange}`
      );
      setReportData(data);
    } catch (error) {
      toast.error("Failed to fetch report data");
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading report data...</div>;
  if (!reportData) return <div className="p-6">No report data available</div>;

  const resourceChartData = reportData.resource_summary.map((item) => ({
    name: item.name,
    utilization: item.utilization_rate,
    allocated: item.allocated_quantity,
    total: item.total_quantity,
    available: item.total_quantity - item.allocated_quantity,
  }));

  const statusPieData = reportData.allocation_status.map((status) => ({
    name: status.status,
    value: status.count,
  }));

  const financialData = [
    {
      name: "Rental Income",
      value: reportData.financial_summary.total_rental_income,
    },
    {
      name: "Damage Charges",
      value: reportData.financial_summary.total_damage_charges,
    },
    {
      name: "Maintenance Costs",
      value: reportData.financial_summary.total_maintenance_costs,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resource Utilization Report</h2>
        <select
          className="p-2 border rounded"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reportData.summary_stats.total_resources}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Utilization Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reportData.summary_stats.avg_utilization_rate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${reportData.financial_summary.total_value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resourceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="allocated" name="Allocated" fill="#8884d8" />
              <Bar dataKey="available" name="Available" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Allocation Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {statusPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {financialData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Needed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportData.maintenance_needed.map((item) => (
              <div key={item.id} className="border p-4 rounded-lg">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Last Maintenance:{" "}
                  {new Date(item.last_maintenance_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Days Overdue: {item.days_overdue}
                </p>
                <p className="text-sm text-muted-foreground">
                  Condition:{" "}
                  <span className="capitalize">{item.condition}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
