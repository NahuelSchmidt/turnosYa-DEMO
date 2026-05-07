"use client";

import { useRef, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TimeSlotPickerProps {
  timeSlots: string[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  bookedSlots?: string[];
  blockedDates?: string[];
}

export default function TimeSlotPicker({
  timeSlots,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  bookedSlots = [],
  blockedDates = [],
}: TimeSlotPickerProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = new Date();
  const todayDateStr = format(now, 'yyyy-MM-dd');
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isSelectedDateToday = selectedDateStr === todayDateStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const isPastSlot = (slot: string): boolean => {
    if (!isSelectedDateToday) return false;
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m <= nowMinutes;
  };

  const handleDayClick = useCallback(
    (date: Date | undefined) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSelectDate(date);
      }, 300);
    },
    [onSelectDate]
  );

  const isCalendarDayDisabled = (date: Date): boolean => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (blockedDates.includes(dateStr)) return true;
    if (dateStr === todayDateStr && timeSlots.length > 0) {
      const allUnavailable = timeSlots.every((slot) => {
        if (bookedSlots.includes(slot)) return true;
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m <= nowMinutes;
      });
      return allUnavailable;
    }
    return false;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige Fecha y Hora</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDayClick}
            className="rounded-md border"
            disabled={isCalendarDayDisabled}
            locale={es}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Horarios Disponibles</h3>
            {selectedDate && (
              <span className="text-xs text-muted-foreground capitalize">
                {format(selectedDate, "eeee dd/MM", { locale: es })}
              </span>
            )}
          </div>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay horarios configurados.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                const isPast = isPastSlot(slot);
                const isDisabled = isBooked || isPast;
                const isSelected = selectedTime === slot;
                return (
                  <div key={slot} className="relative">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !isDisabled && onSelectTime(slot)}
                      disabled={isDisabled}
                      className={isDisabled ? "opacity-40 cursor-not-allowed line-through text-muted-foreground" : ""}
                    >
                      {slot}
                    </Button>
                    {isBooked && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" /> Disponible
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" /> Ocupado
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
