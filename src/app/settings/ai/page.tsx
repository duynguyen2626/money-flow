"use client";

import { useState } from "react";
import {
    Bot,
    Settings as SettingsIcon,
    Activity,
    Key,
    MessageSquare,
    ShieldCheck,
    Zap,
    Info,
    ExternalLink,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select-shadcn";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AIManagementPage() {
    const [activeTab, setActiveTab] = useState("general");

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <Bot className="h-6 w-6 text-white" />
                        </div>
                        AI Management
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Configure your AI assistant, manage API tokens, and monitor bot health.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        All Systems Operational
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 md:w-[400px] mb-8 bg-slate-100 p-1">
                    <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="platforms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Activity className="h-4 w-4 mr-2" />
                        Platforms
                    </TabsTrigger>
                    <TabsTrigger value="health" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Zap className="h-4 w-4 mr-2" />
                        Health
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Model Configuration */}
                        <Card className="md:col-span-2 shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="h-5 w-5 text-blue-500" />
                                    Provider Configuration
                                </CardTitle>
                                <CardDescription>
                                    Choose your LLM provider and paste your API keys. These are stored securely.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="provider">Preferred Provider</Label>
                                    <Select defaultValue="gemini">
                                        <SelectTrigger id="provider" className="w-full">
                                            <SelectValue placeholder="Select Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gemini">Google Gemini (Recommended)</SelectItem>
                                            <SelectItem value="groq">Groq (Blazing Fast)</SelectItem>
                                            <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="model">Model Name</Label>
                                        <Badge variant="secondary" className="text-[10px] font-mono">Free Tier Available</Badge>
                                    </div>
                                    <Select defaultValue="gemini-2.0-flash">
                                        <SelectTrigger id="model">
                                            <SelectValue placeholder="Select Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</SelectItem>
                                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Smarts)</SelectItem>
                                            <SelectItem value="llama-3.3-70b">Llama 3.3 70B (Groq)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="api-key">API API Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="api-key"
                                            type="password"
                                            placeholder="Enter your API key..."
                                            className="pr-10"
                                            value="••••••••••••••••••••••••••••"
                                            readOnly
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Key is retrieved from environment variables for maximum security.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 border-t py-4">
                                <Button className="ml-auto bg-blue-600 hover:bg-blue-700">Save Configuration</Button>
                            </CardFooter>
                        </Card>

                        {/* Persona Setup */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-purple-500" />
                                    Bot Persona
                                </CardTitle>
                                <CardDescription>
                                    How should your bot behave?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold">Rolly (Sassy)</Label>
                                            <p className="text-xs text-slate-500 italic">"Why are you wasting money again??"</p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors cursor-pointer opacity-50">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold">Professional</Label>
                                            <p className="text-xs text-slate-500 italic">"Transaction recorded successfully."</p>
                                        </div>
                                        <Switch />
                                    </div>

                                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors cursor-pointer opacity-50">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold">Funny Guy</Label>
                                            <p className="text-xs text-slate-500 italic">"Spending money like Bruce Wayne!"</p>
                                        </div>
                                        <Switch />
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-2">
                                    <Label>Language Support</Label>
                                    <Select defaultValue="vi">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vi">Vietnamese (Tiếng Việt)</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="platforms" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle>Telegram Bot</CardTitle>
                                    <CardDescription>Forward messages to record transactions.</CardDescription>
                                </div>
                                <div className="h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-sky-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-slate-50 rounded-md border border-dashed text-sm text-slate-600">
                                    Webhook URL: <code className="text-blue-600">https://.../api/ai/telegram</code>
                                </div>
                                <Button variant="outline" className="w-full gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Setup via @BotFather
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle>Slack Integration</CardTitle>
                                    <CardDescription>Record expenses via Slack channels.</CardDescription>
                                </div>
                                <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-rose-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-slate-50 rounded-md border border-dashed text-sm text-slate-600 opacity-50">
                                    App manifest required for setup.
                                </div>
                                <Button variant="outline" className="w-full" disabled>
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="health" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Latency</span>
                            <span className="text-2xl font-bold text-slate-900">450ms</span>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none">Excellent</Badge>
                        </Card>
                        <Card className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Quota Used</span>
                            <span className="text-2xl font-bold text-slate-900">12 / 1.5k</span>
                            <span className="text-[10px] text-slate-400">Daily Requests</span>
                        </Card>
                        <Card className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Tokens Out</span>
                            <span className="text-2xl font-bold text-slate-900">24.5k</span>
                            <span className="text-[10px] text-slate-400">Last 24 Hours</span>
                        </Card>
                        <Card className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Success Rate</span>
                            <span className="text-2xl font-bold text-slate-900">100%</span>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none">Stable</Badge>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                                                <Bot className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Parsed: "Ăn tối 150k"</span>
                                                <span className="text-[10px] text-slate-400">Gemini 2.0 Flash • 2 minutes ago</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
