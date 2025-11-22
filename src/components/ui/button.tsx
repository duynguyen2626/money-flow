
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

// Ensure tooltip behavior is independent per icon
export const TooltipTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div {...props}>
      {children}
    </div>
  );
};

// Example usage in the quick action buttons
// Replace with proper tooltip logic using a state-based approach
const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

<button
  onMouseEnter={() => setHoveredIcon('income')}
  onMouseLeave={() => setHoveredIcon(null)}
  className="relative"
>
  <Plus className="h-8 w-8 text-emerald-600" />
  {hoveredIcon === 'income' && (
    <Tooltip className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-gray-800 text-white text-xs px-2 py-1 rounded">
      Income
    </Tooltip>
  )}
</button>