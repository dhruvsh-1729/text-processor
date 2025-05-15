import React, { useEffect, useRef } from 'react';
import { TableRow } from './types';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
// @ts-ignore - Skip type checking for font file
import { font } from './data/NotoSans-VariableFont_wdth,wght-normal';

// Extend jsPDF type definition to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
  }
}

(jsPDF as any).prototype.autoTable = autoTable;
import { Document, Packer, Paragraph, Table, TableCell, TableRow as TRow, WidthType, TextRun } from 'docx';

interface EditableTableProps {
  rows: TableRow[];
  selectedRowIndex: number | null;
  setSelectedRowIndex: (index: number) => void;
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>;
  addRow: () => void;
}

const registerNotoSans = () => {
  try {
    const callAddFont = function (this: any) {
      this.addFileToVFS('NotoSans-VariableFont_wdth,wght-normal.ttf', font);
      this.addFont(
        'NotoSans-VariableFont_wdth,wght-normal.ttf',
        'NotoSansDevanagari', // Simplified font name
        'normal'
      );
    };
    (jsPDF as any).API.events.push(['addFonts', callAddFont]);
  } catch (error) {
    console.error('Font registration failed:', error);
  }
};

const EditableTable: React.FC<EditableTableProps> = ({
  rows,
  selectedRowIndex,
  setSelectedRowIndex,
  setRows,
  addRow,
}) => {
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    const lastIndex = rows.length - 1;
    setSelectedRowIndex(lastIndex);
  }, [rows]);

  useEffect(() => {
    inputRefs.current[selectedRowIndex as number || 0]?.focus();
  }, [selectedRowIndex]);

  const exportToPDF = () => {
    registerNotoSans();

    const doc = new jsPDF();
    doc.setFont("NotoSansDevanagari");

    // Define table headers
    const headers = [['Sr.', 'V.T', 'Granth', 'ShastraPath', 'Pub. Rem', 'In. Rem']];

    // Map your rows to match the headers
    const data = rows.map((row, index) => [
      index + 1,
      row.col2 || '',
      row.col3 || '',
      row.col4 || '',
      row.col5 || '',
      row.col6 || '',
    ]);

    // Add the table to the PDF
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 20,
      styles: {
        fontSize: 10,
        font: "NotoSansDevanagari", // Use your registered font name
        fontStyle: 'normal',
        halign: 'left',
      },
      headStyles: {
        fillColor: [22, 160, 133],
        fontStyle: 'bold',
      },
      bodyStyles: {
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 10 }, // Sr.
        1: { cellWidth: 20 }, // V.T
        2: { cellWidth: 30 }, // Granth
        3: { cellWidth: 50 }, // ShastraPath
        4: { cellWidth: 20 }, // Pub. Rem
        5: { cellWidth: 20 }, // In. Rem
      },
      theme: 'grid',
      didParseCell: (data) => {
        data.cell.styles.font = "NotoSansDevanagari";
      }
    });

    // Save the PDF
    doc.save('editable_table.pdf');
  };


  const exportToDocx = () => {
    // Define column widths
    const columnWidths = [5, 5, 25, 45, 12, 8]; // in percentages

    // Define table headers
    const headers = ['Sr.', 'V.T', 'Granth', 'ShastraPath', 'Pub. Rem', 'In. Rem'];

    // Create header row
    const headerRow = new TRow({
      children: headers.map((header, idx) =>
        new TableCell({
          width: {
            size: columnWidths[idx],
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  font: 'Noto Sans Devanagari',
                }),
              ],
            }),
          ],
        })
      ),
    });

    // Create data rows
    const dataRows = rows.map((row, index) =>
      new TRow({
        children: [
          new TableCell({
            width: {
              size: columnWidths[0],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(index + 1),
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: columnWidths[1],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row.col2 || '',
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: columnWidths[2],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row.col3 || '',
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: columnWidths[3],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row.col4 || '',
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: columnWidths[4],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row.col5 || '',
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: {
              size: columnWidths[5],
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row.col6 || '',
                    font: 'Noto Sans Devanagari',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Create the table
    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    });

    // Create the document
    const doc = new Document({
      sections: [
        {
          children: [table],
        },
      ],
    });

    // Generate and download the document
    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'editable_table.docx');
    });
  };

  return (
    <div className="">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-6">
        Editable Table
        {/* <TopExportOptions rows={rows} /> */}
        <button
          onClick={exportToPDF}
          className="mt-2 px-4 py-2 text-sm bg-red-500 text-white rounded"
        >
          Export to PDF
        </button>
        <button
          onClick={exportToDocx}
          className="mt-2 px-4 py-2 text-sm bg-orange-500 text-white rounded"
        >
          Export to docx
        </button>
      </h2>


      <div className="overflow-x-auto">
        <table className="border-collapse border border-gray-300 w-full">
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-2">Sr.</th>
              <th className="border border-gray-300 px-2 py-2">V.T</th>
              <th className="border border-gray-300 px-2 py-2">Granth</th>
              <th className="border border-gray-300 px-2 py-2">ShastraPath</th>
              <th className="border border-gray-300 px-2 py-2">Pub. Rem</th>
              <th className="border border-gray-300 px-2 py-2">In. Rem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: TableRow, index: number) => (
              <tr key={row.id}>
                <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                <td className="border border-gray-300 px-2 py-2 w-1/12">
                  <select
                    value={row.col2 || "स्व"}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setRows((prevRows: TableRow[]) =>
                        prevRows.map((r: TableRow, i: number) =>
                          i === index ? { ...r, col2: e.target.value } : r
                        )
                      )
                    }
                    className="w-full border border-gray-300 px-2 py-1"
                  >
                    <option value="">Select</option>
                    <option value="व्यु">व्यु</option>
                    <option value="व्या">व्या</option>
                    <option value="साल">सा.ल</option>
                    <option value="ल">ल.</option>
                    <option value="लचि">ल.चि.</option>
                    <option value="पर्या">पर्या</option>
                    <option value="विक.">विक.</option>
                    <option value="स्व">स्व.</option>
                    <option value="परि">परि.</option>
                  </select>
                </td>
                <td className='border border-gray-300 px-2 py-2'>
                  <textarea
                    value={row.col3}
                    onClick={() => setSelectedRowIndex(index)}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRows((prevRows: TableRow[]) =>
                        prevRows.map((r: TableRow, i: number) =>
                          i === index ? { ...r, col3: e.target.value } : r
                        )
                      )
                    }
                    className="w-full border px-2 border-gray-300 py-1 resize-none"
                    style={{ height: 'auto', minHeight: '12em' }}
                    rows={1}
                  />
                </td>
                <td className="border border-gray-300 px-2 py-2" style={{ width: '45%' }}>
                  <textarea
                    value={row.col4}
                    onClick={() => setSelectedRowIndex(index)}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRows((prevRows: TableRow[]) =>
                        prevRows.map((r: TableRow, i: number) =>
                          i === index ? { ...r, col4: e.target.value } : r
                        )
                      )
                    }
                    ref={(el: HTMLTextAreaElement | null) => {
                      inputRefs.current[index] = el;
                    }}
                    className="w-full border border-gray-300 px-2 py-1 resize-none"
                    style={{ height: 'auto', minHeight: '12em' }}
                    rows={1}
                  />
                </td>
                <td className="border border-gray-300 px-2 py-2 w-1/10">
                  <div className="flex flex-col w-full">
                    <select
                      value={row.col5.split('=')[0] || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const selectedValue = e.target.value;
                        setRows((prevRows: TableRow[]) =>
                          prevRows.map((r: TableRow, i: number) =>
                            i === index
                              ? { ...r, col5: selectedValue + (selectedValue === 'RA' || selectedValue === 'RC' || selectedValue === 'RS' ? '=' : '') }
                              : r
                          )
                        );
                      }}
                      className="w-full border border-gray-300 px-2 py-1 mb-2"
                    >
                      <option value="">Select</option>
                      <option value="MTN">MTN</option>
                      <option value="MMT">MMT</option>
                      <option value="Samegranth">Samegranth</option>
                      <option value="SinglePath">SinglePath</option>
                      <option value="RA">RA</option>
                      <option value="RC">RC</option>
                      <option value="RS">RS</option>
                    </select>
                    {(row.col5.startsWith('RA=') || row.col5.startsWith('RC=') || row.col5.startsWith('RS=')) && (
                      <textarea
                        value={row.col5.split('=')[1] || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          const newValue = e.target.value;
                          setRows((prevRows: TableRow[]) =>
                            prevRows.map((r: TableRow, i: number) =>
                              i === index
                                ? { ...r, col5: row.col5.split('=')[0] + '=' + newValue }
                                : r
                            )
                          );
                        }}
                        className="border w-full border-gray-300 px-2 py-2 resize-none"
                        style={{ height: '10em' }}
                        rows={1}
                      />
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-2 py-2 w-1/10">
                  <textarea
                    value={row.col6 || ''}
                    onClick={() => setSelectedRowIndex(index)}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRows((prevRows: TableRow[]) =>
                        prevRows.map((r: TableRow, i: number) =>
                          i === index ? { ...r, col6: e.target.value } : r
                        )
                      )
                    }
                    className="w-full border border-gray-300 px-2 py-1 resize-none"
                    style={{ height: 'auto', minHeight: '12em' }}
                    rows={1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Row
        </button>
      </div>
    </div>
  );
};

export default EditableTable;
