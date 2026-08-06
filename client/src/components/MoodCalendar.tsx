import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MoodEntry {
  date: Date;
  moodLevel: number;
  anxietyLevel: number;
  stressLevel: number;
  energyLevel: number;
}

interface MoodCalendarProps {
  entries: MoodEntry[];
  onDateClick?: (date: Date) => void;
}

export function MoodCalendar({ entries, onDateClick }: MoodCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMoodColor = (moodLevel: number): string => {
    if (moodLevel >= 8) return "bg-green-500";
    if (moodLevel >= 6) return "bg-blue-400";
    if (moodLevel >= 4) return "bg-yellow-400";
    if (moodLevel >= 2) return "bg-orange-400";
    return "bg-red-500";
  };

  const getMoodLabel = (moodLevel: number): string => {
    if (moodLevel >= 8) return "Excelente";
    if (moodLevel >= 6) return "Bom";
    if (moodLevel >= 4) return "Regular";
    if (moodLevel >= 2) return "Baixo";
    return "Muito Baixo";
  };

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { year, month, daysInMonth, startingDayOfWeek };
  };

  const getEntryForDate = (date: Date): MoodEntry | undefined => {
    return entries.find(entry => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getDate() === date.getDate() &&
        entryDate.getMonth() === date.getMonth() &&
        entryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { year, month, daysInMonth, startingDayOfWeek } = getMonthData();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const entry = getEntryForDate(date);
    const isToday = 
      date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear();

    calendarDays.push(
      <button
        key={day}
        onClick={() => onDateClick?.(date)}
        className={`aspect-square p-1 rounded-lg transition-all hover:scale-105 ${
          isToday ? "ring-2 ring-purple-600" : ""
        } ${entry ? "cursor-pointer" : "cursor-default"}`}
      >
        <div
          className={`w-full h-full rounded-lg flex flex-col items-center justify-center ${
            entry ? getMoodColor(entry.moodLevel) : "bg-gray-100"
          } ${entry ? "text-white font-semibold" : "text-gray-400"}`}
        >
          <span className="text-sm">{day}</span>
          {entry && (
            <span className="text-xs mt-1 opacity-90">
              {entry.moodLevel}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Histórico de Humor</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Excelente (8-10)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-400" />
            <span>Bom (6-7)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-400" />
            <span>Regular (4-5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-400" />
            <span>Baixo (2-3)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Muito Baixo (1)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day names header */}
          {dayNames.map(name => (
            <div key={name} className="text-center text-xs font-semibold text-gray-600 pb-2">
              {name}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays}
        </div>

        {/* Statistics */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Estatísticas do Mês</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {entries.filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() === month && d.getFullYear() === year;
                }).length}
              </div>
              <div className="text-xs text-gray-600">Registros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {entries.filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() === month && d.getFullYear() === year && e.moodLevel >= 8;
                }).length}
              </div>
              <div className="text-xs text-gray-600">Dias Excelentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {entries.filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() === month && d.getFullYear() === year && e.moodLevel >= 6 && e.moodLevel < 8;
                }).length}
              </div>
              <div className="text-xs text-gray-600">Dias Bons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {entries.filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() === month && d.getFullYear() === year && e.moodLevel < 4;
                }).length}
              </div>
              <div className="text-xs text-gray-600">Dias Difíceis</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
