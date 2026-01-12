
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AvatarWrapper({ src, fallback, className }: { src?: string | null, fallback: string, className?: string }) {
    return (
        <Avatar className={className}>
            <AvatarImage src={src || undefined} />
            <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
    )
}
