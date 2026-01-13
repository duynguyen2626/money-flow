
const { getOriginalAccount } = require('./src/actions/transaction-actions');

async function main() {
    const refundRequestId = '0a0810c7-a97a-45a1-8000-cf4fdd0c724a';
    console.log('Testing getOriginalAccount for:', refundRequestId);
    try {
        const result = await getOriginalAccount(refundRequestId);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
