import * as XLSX from 'xlsx';

export interface ParsedChecklistItem {
  barcode: string;
  productName: string;
  productCode?: string;
  targetQuantity: number;
}

export interface ParsedChecklistData {
  items: ParsedChecklistItem[];
  fileName: string;
}

/**
 * Parse Excel/Numbers file and extract checklist items
 * Handles files with multiple header rows or complex structures
 */
export async function parseChecklistFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedChecklistData> {
  try {
    // Read the workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Get raw data without headers to analyze structure
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('No data found in sheet');
    }
    
    console.log('[FileParser] Raw data rows:', rawData.length);
    console.log('[FileParser] First 3 rows:', JSON.stringify(rawData.slice(0, 3)));
    
    // Find the header row by looking for rows that contain keywords
    let headerRowIndex = 0;
    const headerKeywords = ['条码', 'barcode', '数量', 'quantity', 'qty', '产品', 'product'];
    
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      const rowStr = row.join('|').toLowerCase();
      const matchCount = headerKeywords.filter(kw => rowStr.includes(kw.toLowerCase())).length;
      
      if (matchCount >= 2) {
        headerRowIndex = i;
        console.log(`[FileParser] Found header row at index ${i}`);
        break;
      }
    }
    
    const headerRow = rawData[headerRowIndex];
    if (!headerRow) {
      throw new Error('Could not find header row in file');
    }
    
    console.log('[FileParser] Header row:', headerRow);
    
    // Find column indices with more precise matching
    const findColumnIndex = (keywords: string[], excludeKeywords?: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cellValue = String(headerRow[i] || '').toLowerCase().trim();
        
        // Skip if matches exclude keywords
        if (excludeKeywords && excludeKeywords.some(kw => cellValue.includes(kw.toLowerCase()))) {
          continue;
        }
        
        // Try exact match first
        if (keywords.some(keyword => cellValue === keyword.toLowerCase())) {
          return i;
        }
        
        // Then try partial match
        if (keywords.some(keyword => cellValue.includes(keyword.toLowerCase()))) {
          return i;
        }
      }
      return -1;
    };
    
    // Find columns with specific priority and exclusions
    const barcodeIndex = findColumnIndex(['barcode', '条码', '条形码', 'code', 'ean', 'upc', 'sku', '商品条码']);
    const quantityIndex = findColumnIndex(['quantity', 'qty', '数量', '目标数量', 'target', '件数', 'count', 'amount']);
    
    // For product name, exclude columns that contain 'id' or 'code'
    const productNameIndex = findColumnIndex(
      ['product', 'name', '产品', '名称', '产品名称', '商品名称', '商品', '品名', 'productname', 'pname'],
      ['id', 'code', 'sku', '编码', '编号']
    );
    
    const productCodeIndex = findColumnIndex(['product', 'code', 'sku', '产品编码', '编码', '商品编码', 'productcode', 'pcode']);
    
    console.log('[FileParser] Column indices - barcode:', barcodeIndex, 'quantity:', quantityIndex, 'productName:', productNameIndex, 'productCode:', productCodeIndex);
    
    if (barcodeIndex === -1 || quantityIndex === -1) {
      throw new Error(`Could not find barcode or quantity columns in file. Header row: ${headerRow.join(', ')}`);
    }
    
    // Parse items starting from the row after headers
    const items: ParsedChecklistItem[] = [];
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      if (!row || row.length === 0) {
        continue;
      }
      
      const barcode = String(row[barcodeIndex] || '').trim();
      const productName = productNameIndex >= 0 ? String(row[productNameIndex] || '').trim() : '';
      const productCode = productCodeIndex >= 0 ? String(row[productCodeIndex] || '').trim() : undefined;
      const targetQuantity = parseInt(String(row[quantityIndex] || '1'), 10);
      
      // Skip empty rows or rows without barcode
      if (!barcode || isNaN(targetQuantity)) {
        continue;
      }
      
      items.push({
        barcode,
        productName: productName || 'Unknown Product',
        productCode: productCode || undefined,
        targetQuantity: Math.max(1, targetQuantity),
      });
    }
    
    if (items.length === 0) {
      throw new Error('No valid items found in file');
    }
    
    console.log(`[FileParser] Successfully parsed ${items.length} items from ${fileName}`);
    
    return {
      items,
      fileName,
    };
  } catch (error) {
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
