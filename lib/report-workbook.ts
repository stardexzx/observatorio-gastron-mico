import { strToU8, zipSync } from "fflate";

const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const spreadsheet = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const packageRelationships = "http://schemas.openxmlformats.org/package/2006/relationships";
const documentRelationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const escapeXml = (value: string) => value
  .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function reportWorkbook(rows: (string | number)[][]) {
  const sheetRows = rows.map((row, index) => {
    const cells = row.map(value => typeof value === "number"
      ? `<c><v>${value}</v></c>`
      : `<c t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`).join("");
    return `<row r="${index + 1}">${cells}</row>`;
  }).join("");
  const files = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${documentRelationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="${spreadsheet}" xmlns:r="${documentRelationships}"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${documentRelationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${spreadsheet}"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, xml]) => [path, strToU8(xmlHeader + xml)])));
}
