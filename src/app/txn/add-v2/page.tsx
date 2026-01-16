export default function TestV2Page() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-muted/40 p-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Transaction Slide V2</h1>
                <p className="text-muted-foreground max-w-[500px]">
                    Feature is currently paused for redesign.
                    Will be implemented in future iterations to provide a better splitting experience.
                </p>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md w-full p-6">
                <div className="flex flex-col space-y-1.5 p-6 pt-0">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Status: Paused</h3>
                    <p className="text-sm text-muted-foreground">Pending Layout Redesign</p>
                </div>
            </div>
        </div>
    );
}
