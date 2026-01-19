import { Person } from "@/types/moneyflow.types";
import { Badge } from "@/components/ui/badge";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface SubscriptionBadgesProps {
    subscriptions: NonNullable<Person['subscription_details']>;
    maxDisplay?: number;
}

export function SubscriptionBadges({ subscriptions }: SubscriptionBadgesProps) {
    if (!subscriptions || subscriptions.length === 0) return null;

    // Calculate total slots
    const totalSlots = subscriptions.reduce((sum, sub) => sum + (sub.slots || 1), 0);

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <div className="inline-flex cursor-help">
                    <Badge
                        variant="secondary"
                        className="h-6 px-2 font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors"
                    >
                        + {totalSlots} Slots
                    </Badge>
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto p-3" align="start">
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                        Active Subscriptions
                    </p>
                    {subscriptions.map((sub, idx) => (
                        <div key={`${sub.id}-${idx}`} className="flex items-center gap-2 text-sm bg-slate-50 p-1.5 rounded-md border border-slate-100 min-w-[140px]">
                            {sub.image_url ? (
                                <img
                                    src={sub.image_url}
                                    alt={sub.name}
                                    className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200"
                                />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                    {sub.name[0]}
                                </div>
                            )}
                            <span className="font-medium text-slate-700 flex-1">{sub.name}</span>
                            <Badge variant="secondary" className="h-5 px-1.5 min-w-[24px] justify-center bg-indigo-100 text-indigo-700 font-bold border-none text-[10px]">
                                x{sub.slots}
                            </Badge>
                        </div>
                    ))}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
