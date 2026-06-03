import { parseChecklistFile } from './server/fileParser.ts';
import fs from 'fs';

const fileBuffer = fs.readFileSync('/home/ubuntu/upload/pasted_file_NiROQO_damo-1.xlsx');
const result = await parseChecklistFile(fileBuffer, 'damo-1.xlsx');

console.log('\n=== Parse Result ===');
console.log(`Total items: ${result.items.length}`);
console.log('\nFirst 5 items:');
result.items.slice(0, 5).forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.productName} (${item.barcode}) - Qty: ${item.targetQuantity}`);
});
