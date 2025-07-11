import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';

interface DateRangePickerProps {
    selectedDates: string[];
    onDatesChange: (dates: string[]) => void;
    initialDate?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ selectedDates, onDatesChange, initialDate }) => {
    const getInitialDate = () => {
        if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
            const parts = initialDate.split('-').map(Number);
            // new Date(year, monthIndex, day) creates a local date
            const date = new Date(parts[0], parts[1] - 1, parts[2]);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return new Date();
    };
    
    const [currentMonth, setCurrentMonth] = useState(getInitialDate());

    const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

    const handleDayClick = (day: number) => {
        // Use UTC to prevent timezone issues. `new Date()` uses local timezone,
        // which can result in the previous day when converted to ISO string in some timezones.
        // Date.UTC returns a timestamp, which we then use to create a correct Date object.
        const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), day));
        const dateStr = date.toISOString().split('T')[0];

        const newDates = new Set(selectedSet);
        if (newDates.has(dateStr)) {
            newDates.delete(dateStr); // Deselect if already present
        } else {
            newDates.add(dateStr); // Select if not present
        }
        onDatesChange(Array.from(newDates));
    };
    
    const clearSelection = () => {
        onDatesChange([]);
    }

    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with day overflow
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first

    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const paddingDays = Array.from({ length: firstDayOfMonth });
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
                 <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeftIcon /></button>
                 <div className="font-semibold text-gray-800 dark:text-gray-200">
                     {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                 </div>
                 <button type="button" onClick={() => changeMonth(1)} className="p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRightIcon /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
                 {weekDays.map(day => <div key={day} className="font-medium">{day}</div>)}
                 {paddingDays.map((_, i) => <div key={`pad-${i}`}></div>)}
                 {calendarDays.map(day => {
                    const date = new Date(Date.UTC(year, month, day));
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedSet.has(dateStr);

                    let classes = "w-full aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-colors text-sm ";
                    if (isSelected) {
                        classes += "bg-blue-600 text-white font-bold hover:bg-blue-700 ";
                    } else {
                         classes += "hover:bg-gray-200 dark:hover:bg-gray-700 ";
                    }

                    return (
                        <div key={day} onClick={() => handleDayClick(day)} className={classes}>
                            {day}
                        </div>
                    );
                 })}
            </div>
            {selectedDates.length > 0 && (
                <div className="text-center mt-3">
                    <button type="button" onClick={clearSelection} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center mx-auto">
                        <Cross2Icon className="mr-1"/>
                        Clear Selection
                    </button>
                </div>
            )}
        </div>
    );
};
