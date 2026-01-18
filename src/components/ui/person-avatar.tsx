import { cn } from "@/lib/utils";

const COLORS = [
    "bg-blue-500 text-white",
    "bg-teal-500 text-white",
    "bg-orange-500 text-white",
    "bg-red-500 text-white",
    "bg-amber-500 text-white",
    "bg-brown-500 text-white",
    "bg-green-500 text-white",
    "bg-purple-500 text-white",
];

function getColorFromName(name: string): string {
    const charCode = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return COLORS[charCode % COLORS.length];
}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

type PersonAvatarProps = {
    name: string;
    imageUrl?: string | null;
    size?: "sm" | "md" | "lg";
    className?: string;
};

export function PersonAvatar({ name, imageUrl, size = "sm", className }: PersonAvatarProps) {
    const sizeClasses = {
        sm: "w-4 h-4 text-[10px]",
        md: "w-8 h-8 text-sm",
        lg: "w-12 h-12 text-lg",
    };

    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt={name}
                className={cn(
                    sizeClasses[size],
                    "rounded-[4px] object-cover",
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                sizeClasses[size],
                "rounded-[4px] flex items-center justify-center font-bold",
                getColorFromName(name),
                className
            )}
        >
            {getInitials(name)}
        </div>
    );
}
