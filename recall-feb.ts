import { recallServiceDistribution } from './src/services/service-manager.js';

async function run() {
    try {
        const monthTag = '2026-02';
        console.log(`Recalling service distribution for ${monthTag}...`);
        const result = await recallServiceDistribution(monthTag);
        console.log(`Success! Recalled ${result.count} transactions.`);
        process.exit(0);
    } catch (err) {
        console.error('Error during recall:', err);
        process.exit(1);
    }
}

run();
