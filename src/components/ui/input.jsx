import * as React from "react"
import { cn } from "@/lib/utils"

const toProperCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const Input = React.forwardRef(({ className, type, onChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (props.id === 'product_name' || props.name === 'product_name') {
      e.target.value = toProperCase(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      onChange={handleChange}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }