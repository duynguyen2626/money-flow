"use server";

export async function logToServer(message: string, data?: any) {
    console.log(`[CLIENT-LOG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

export async function logErrorToServer(message: string, error?: any) {
    console.error(`[CLIENT-ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : "");
}
