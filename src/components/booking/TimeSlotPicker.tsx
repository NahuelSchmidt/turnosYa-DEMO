"use client";

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
}

export default function TimeSlotPicker({
  timeSlots,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  bookedSlots = [],
}: TimeSlotPickerProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige Fecha y Hora</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDate}
            className="rounded-md border"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                const isSelected = selectedTime === slot;
                return (
                  <div key={slot} className="relative">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !isBooked && onSelectTime(slot)}
                      disabled={isBooked}
                      className={isBooked ? "opacity-40 cursor-not-allowed line-through text-muted-foreground" : ""}
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
