import React, { useEffect, useRef } from 'react';
import { TableRow } from './types';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

// Extend jsPDF type definition to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
  }
}

(jsPDF as any).prototype.autoTable = autoTable;
import { Document, Packer, Paragraph, Table, TableCell, TableRow as DocxTableRow, WidthType } from 'docx';

interface EditableTableProps {
  rows: TableRow[];
  selectedRowIndex: number | null;
  setSelectedRowIndex: (index: number) => void;
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>;
  addRow: () => void;
}

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

  return (
    <div className="">
      <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
        Editable Table
        {/* <TopExportOptions rows={rows} /> */}
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
                className="border border-gray-300 px-2 py-1 resize-none"
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

const TopExportOptions = ({ rows }: { rows: any[] }) => {

  const exportToCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const csvOutput = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'table_data.csv');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumnHeaders = ['Sr.', 'V.T', 'Granth', 'ShastraPath', 'Pub. Rem', 'In. Rem'];
    const tableRows = rows.map((row, index) => [
      index + 1,
      row.col2,
      row.col3,
      row.col4,
      row.col5,
      '',
    ]);
    doc.text('Editable Table', 14, 10);
    doc.autoTable({
      head: [tableColumnHeaders],
      body: tableRows,
      startY: 20,
    });
    doc.save('table_data.pdf');
  };

  const exportToDocx = async () => {
    const tableRows = rows.map((row, index) => {
      return new DocxTableRow({
        children: [
          new TableCell({ children: [new Paragraph((index + 1).toString())] }),
          new TableCell({ children: [new Paragraph(row.col2)] }),
          new TableCell({ children: [new Paragraph(row.col3)] }),
          new TableCell({ children: [new Paragraph(row.col4)] }),
          new TableCell({ children: [new Paragraph(row.col5)] }),
          new TableCell({ children: [new Paragraph('')] }),
        ],
      });
    });

    const table = new Table({
      rows: [
        new DocxTableRow({
          children: [
            new TableCell({ children: [new Paragraph('Sr.')], width: { size: 10, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('V.T')], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('Granth')], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('ShastraPath')], width: { size: 35, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('Pub. Rem')], width: { size: 10, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('In. Rem')], width: { size: 10, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...tableRows,
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [table],
        },
      ],
    });

    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, 'table_data.docx');
  };

  return (
    <div className="mt-4 flex text-black text-sm gap-2">
      <button
        onClick={exportToCSV}
        className="px-4 py-2 bg-blue-300 text-black rounded"
      >
        Export to CSV
      </button>
      <button
        onClick={exportToPDF}
        className="px-4 py-2 bg-orange-500 text-black rounded"
      >
        Export to PDF
      </button>
      <button
        onClick={exportToDocx}
        className="px-4 py-2 bg-yellow-500 text-black rounded"
      >
        Export to DOCX
      </button>
    </div>
  );
}