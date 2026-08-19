import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm",
        className
      )}
      classNames={{
        // Core Layout
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        
        // Month & Year Header
        caption: "flex justify-center pt-2 relative items-center mb-4",
        month_caption: "flex justify-center pt-2 relative items-center mb-4", // v9 compat
        caption_label: "text-sm font-semibold text-slate-900 dark:text-slate-100",
        
        // Navigation Buttons
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-md"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        button_previous: cn( // v9 compat
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-md absolute left-1"
        ),
        button_next: cn( // v9 compat
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-md absolute right-1"
        ),

        // Grid/Table Structure - Strictly 7 Columns
        table: "w-full border-collapse",
        month_grid: "w-full border-collapse", // v9 compat
        head_row: "grid grid-cols-7 w-full mb-2",
        weekdays: "grid grid-cols-7 w-full mb-2", // v9 compat
        head_cell: "text-slate-500 dark:text-slate-400 rounded-md font-medium text-[0.8rem] text-center w-full",
        weekday: "text-slate-500 dark:text-slate-400 rounded-md font-medium text-[0.8rem] text-center w-full", // v9 compat
        row: "grid grid-cols-7 w-full mt-1 gap-y-1",
        week: "grid grid-cols-7 w-full mt-1 gap-y-1", // v9 compat
        
        // Individual Day Cells
        cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center [&:has([aria-selected])]:bg-blue-50 dark:[&:has([aria-selected])]:bg-blue-900/30 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md w-full",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors aria-selected:opacity-100 mx-auto"
        ),
        day_button: cn( // v9 compat
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors aria-selected:opacity-100 mx-auto"
        ),

        // Selected & State Modifiers
        day_range_end: "day-range-end",
        range_end: "day-range-end", // v9 compat
        day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white font-medium shadow-sm",
        selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white font-medium shadow-sm", // v9 compat
        day_today: "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold",
        today: "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold", // v9 compat
        day_outside: "day-outside text-slate-400 dark:text-slate-500 opacity-50 aria-selected:bg-slate-100/50 dark:aria-selected:bg-slate-800/50 aria-selected:text-slate-500 aria-selected:opacity-30",
        outside: "day-outside text-slate-400 dark:text-slate-500 opacity-50 aria-selected:bg-slate-100/50 dark:aria-selected:bg-slate-800/50 aria-selected:text-slate-500 aria-selected:opacity-30", // v9 compat
        day_disabled: "text-slate-400 dark:text-slate-500 opacity-50",
        disabled: "text-slate-400 dark:text-slate-500 opacity-50", // v9 compat
        day_range_middle: "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-900 dark:aria-selected:text-blue-100 rounded-none shadow-none",
        range_middle: "aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-900 dark:aria-selected:text-blue-100 rounded-none shadow-none", // v9 compat
        day_hidden: "invisible",
        hidden: "invisible", // v9 compat
        ...classNames,
      }}
      components={{
        // Compatibility for v8
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        // Compatibility for v9
        Chevron: ({ orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" {...props} />
          }
          return <ChevronRight className="h-4 w-4" {...props} />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }