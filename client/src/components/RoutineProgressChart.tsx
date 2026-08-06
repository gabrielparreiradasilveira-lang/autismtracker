import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProgressData {
  date: string;
  completionRate: number;
  completed: number;
  total: number;
}

interface RoutineProgressChartProps {
  data: ProgressData[];
  period: "week" | "month";
}

export function RoutineProgressChart({ data, period }: RoutineProgressChartProps) {
  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: "Taxa de Conclusão (%)",
        data: data.map(d => d.completionRate),
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const item = data[index];
            return [
              `Taxa: ${item.completionRate}%`,
              `Completadas: ${item.completed}/${item.total}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  const avgCompletion = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.completionRate, 0) / data.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Progresso {period === "week" ? "Semanal" : "Mensal"}
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{avgCompletion}%</div>
            <div className="text-xs text-gray-600">Média de Conclusão</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {data.reduce((sum, d) => sum + d.completed, 0)}
            </div>
            <div className="text-xs text-gray-600">Completadas</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {data.reduce((sum, d) => sum + d.total, 0)}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {data.length}
            </div>
            <div className="text-xs text-gray-600">Dias Registrados</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
