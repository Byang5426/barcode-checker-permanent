import { describe, it, expect } from "vitest";
import { parseChecklistFile } from "./fileParser";
import * as XLSX from "xlsx";

describe("fileParser", () => {
  it("should parse a valid Excel file with barcode and quantity columns", async () => {
    // Create a test Excel file
    const data = [
      { barcode: "4547691811868", productName: "冈本003玻尿酸", quantity: 10 },
      { barcode: "4547691815415", productName: "冈本爽滑快感", quantity: 5 },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const result = await parseChecklistFile(buffer, "test.xlsx");

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      barcode: "4547691811868",
      productName: "冈本003玻尿酸",
      targetQuantity: 10,
    });
    expect(result.items[1]).toMatchObject({
      barcode: "4547691815415",
      productName: "冈本爽滑快感",
      targetQuantity: 5,
    });
    expect(result.fileName).toBe("test.xlsx");
  });

  it("should handle Chinese column names", async () => {
    const data = [
      { 条码: "123456", 产品名称: "测试产品", 数量: 3 },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const result = await parseChecklistFile(buffer, "test.xlsx");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].barcode).toBe("123456");
    expect(result.items[0].productName).toBe("测试产品");
    expect(result.items[0].targetQuantity).toBe(3);
  });

  it("should throw error if barcode column is missing", async () => {
    const data = [
      { productName: "测试产品", quantity: 5 },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

    await expect(parseChecklistFile(buffer, "test.xlsx")).rejects.toThrow(
      "Could not find barcode or quantity columns"
    );
  });

  it("should throw error if quantity column is missing", async () => {
    const data = [
      { barcode: "123456", productName: "测试产品" },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

    await expect(parseChecklistFile(buffer, "test.xlsx")).rejects.toThrow(
      "Could not find barcode or quantity columns"
    );
  });

  it("should skip empty rows", async () => {
    const data = [
      { barcode: "123456", productName: "产品1", quantity: 1 },
      { barcode: "", productName: "", quantity: 0 },
      { barcode: "789012", productName: "产品2", quantity: 2 },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const result = await parseChecklistFile(buffer, "test.xlsx");

    expect(result.items).toHaveLength(2);
    expect(result.items[0].barcode).toBe("123456");
    expect(result.items[1].barcode).toBe("789012");
  });
});
