
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = 'src/actions/transaction-actions.ts';
let c = fs.readFileSync(path, 'utf8'); // Reading as utf8 might mangle the utf16 part but the start is good.

const marker = 'export async function getSplitChildrenAction(parentId: string) {';
const markerIdx = c.indexOf(marker);

if (markerIdx > 0) {
    const endParams = '}));';
    // Find the first })); AFTER the marker
    const endIdx = c.indexOf(endParams, markerIdx);

    if (endIdx > 0) {
        // We want to keep })); and the following }
        // The file structure is:
        // ...
        //   return (data || []).map((txn: any) => ({
        //     ...
        //   }));
        // }
        // <GARBAGE>

        // Find the next '}' after endIdx
        const closingBraceIdx = c.indexOf('}', endIdx);

        if (closingBraceIdx > 0) {
            const truncateAt = closingBraceIdx + 1;
            console.log('Truncating at ' + truncateAt);

            // Take the good part
            const goodContent = c.substring(0, truncateAt);

            const newFunc = `

export async function getOriginalAccount(refundTransactionId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from('transactions').select('metadata').eq('id', refundTransactionId).single();
  
  if (!data) return null;
  const meta = (data.metadata as any);
  
  if (!meta?.original_transaction_id) return null;

  const { data: original } = await supabase.from('transactions').select('account_id').eq('id', meta.original_transaction_id).single();
  
  return original?.account_id || null;
}
`;
            fs.writeFileSync(path, goodContent + newFunc);
            console.log('Fixed file successfully.');
        } else {
            console.log('Closing brace not found');
        }
    } else {
        console.log('End params not found');
    }
} else {
    console.log('Start marker not found');
}
