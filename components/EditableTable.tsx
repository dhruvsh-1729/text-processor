import React, { useEffect, useRef, useState } from 'react';
import { TableRow } from './types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow as TRow, WidthType, TextRun, ImageRun, TableLayoutType, UnderlineType } from 'docx';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Editor from 'react-simple-wysiwyg';

// @ts-expect-error - Skip type checking for font file
import { font } from './data/NotoSans-VariableFont_wdth,wght-normal';

export function htmlToTextRuns(html: string, font = 'Noto Sans Devanagari') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as HTMLElement;
  const result: TextRun[] = [];

  function traverse(node: Node, formatting: { bold: boolean; italics: boolean; underline: boolean; }) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Split by \n for line breaks
      node.textContent?.split('\n').forEach((segment, idx) => {
        if (segment.trim().length > 0 || idx === 0) {
          result.push(
            new TextRun({
              text: segment,
              bold: formatting.bold,
              italics: formatting.italics,
              underline: formatting.underline ? { type: UnderlineType.SINGLE } : undefined,
              font,
              break: idx > 0 ? 1 : 0,
            })
          );
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      traverseChildren(el, {
        bold: formatting.bold || el.tagName === 'B' || el.tagName === 'STRONG',
        italics: formatting.italics || el.tagName === 'I' || el.tagName === 'EM',
        underline: formatting.underline || el.tagName === 'U',
      });
    }
  }

  function traverseChildren(parent: Node, formatting: { bold: boolean; italics: boolean; underline: boolean; }) {
    parent.childNodes.forEach((child) => traverse(child, formatting));
  }

  traverseChildren(container, { bold: false, italics: false, underline: false });

  return result;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
  }
}

(jsPDF as any).prototype.autoTable = autoTable;

interface EditableTableProps {
  rows: TableRow[];
  selectedRowIndex: number | null;
  setSelectedRowIndex: (index: number) => void;
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>;
  addRow: () => void;
  images: { [key: number]: { src: string; crop: Crop }[] };
  setImages: React.Dispatch<React.SetStateAction<{ [key: number]: { src: string; crop: Crop }[] }>>;
  tableName: string;
}

const registerNotoSans = () => {
  try {
    const callAddFont = function (this: any) {
      this.addFileToVFS('NotoSans-VariableFont_wdth,wght-normal.ttf', font);
      this.addFont('NotoSans-VariableFont_wdth,wght-normal.ttf', 'NotoSansDevanagari', 'normal');
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
  images,
  setImages,
  tableName,
}) => {
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [currentImage, setCurrentImage] = useState<{ rowIndex: number; imageIndex: number; src: string } | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 30, height: 30, x: 0, y: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  // State to hold the undo stack
  const [undoStack, setUndoStack] = useState<{ rows: TableRow[]; images: { [key: number]: { src: string; crop: Crop }[] } }[]>([]);

  // Function to save the current state before a change
  const saveState = () => {
    setUndoStack((prevStack) => [...prevStack, { rows, images }]);
  };

  // Effect to update selectedRowIndex when rows change
  useEffect(() => {
    const lastIndex = rows.length - 1;
    setSelectedRowIndex(lastIndex);
  }, [rows]);

  // Effect to focus the selected row's textarea
  useEffect(() => {
    inputRefs.current[selectedRowIndex as number || 0]?.focus();
  }, [selectedRowIndex]);

  // Effect to handle Ctrl + Z for undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        if (undoStack.length > 0) {
          const previousState = undoStack[undoStack.length - 1];
          setRows(previousState.rows);
          setImages(previousState.images);
          setUndoStack((prevStack) => prevStack.slice(0, -1));
        }
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [undoStack, setRows, setImages]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, rowIndex: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        saveState(); // Save state before updating images
        setImages((prev) => ({
          ...prev,
          [rowIndex]: [...(prev[rowIndex] || []), { src, crop: { unit: '%', width: 100, height: 100, x: 0, y: 0 } }],
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropChange = (newCrop: Crop) => {
    setCrop(newCrop);
  };

  const getCroppedImage = (image: HTMLImageElement, crop: Crop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );
    }
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg');
    });
  };

  const handleCropComplete = (rowIndex: number, imageIndex: number, croppedImage: string) => {
    saveState(); // Save state before updating images
    setImages((prev) => {
      const newImages = { ...prev };
      newImages[rowIndex][imageIndex].src = croppedImage;
      return newImages;
    });
    setCurrentImage(null);
  };

  const exportToPDF = () => {
    registerNotoSans();
    const doc = new jsPDF();
    doc.setFont('NotoSansDevanagari');
    const headers = [['Sr.', 'V.T', 'Granth', 'ShastraPath', 'Pub. Rem', 'In. Rem']];
    const data = rows.map((row, index) => [
      index + 1,
      row.col2 || '',
      row.col3 || '',
      row.col4 || '',
      row.col5 || '',
      row.col6 || '',
    ]);
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 20,
      styles: { fontSize: 10, font: 'NotoSansDevanagari', fontStyle: 'normal', halign: 'left' },
      headStyles: { fillColor: [22, 160, 133], fontStyle: 'bold' },
      bodyStyles: { cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      },
      theme: 'grid',
      didParseCell: (data) => {
        data.cell.styles.font = 'NotoSansDevanagari';
      },
    });
    doc.save(`${tableName}.pdf`);
  };

  const exportToDocx = async () => {
    const columnWidths = [1000, 2000, 4000, 8000, 3000, 2000];
    const headers = ['Sr.', 'V.T', 'Granth', 'ShastraPath', 'Pub. Rem', 'In. Rem'];

    const headerRow = new TRow({
      children: headers.map((header, idx) =>
        new TableCell({
          width: { size: columnWidths[idx], type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: header, bold: true, font: 'Noto Sans Devanagari' })],
            }),
          ],
        })
      ),
    });

    const dataRows = await Promise.all(
      rows.map(async (row, index) => {
        const imagesForRow = images[index] || [];
        const imageElements = await Promise.all(
          imagesForRow.map(async (img) => {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return new ImageRun({
              data: arrayBuffer,
              transformation: { width: 100, height: 100 },
              type: 'png',
            });
          })
        );

        return new TRow({
          children: [
            new TableCell({
              width: { size: columnWidths[0], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: String(index + 1), font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
            new TableCell({
              width: { size: columnWidths[1], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: row.col2 || '', font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
            new TableCell({
              width: { size: columnWidths[2], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: row.col3 || '', font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
            new TableCell({
              width: { size: columnWidths[3], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: row.col4 || '', font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
            new TableCell({
              width: { size: columnWidths[4], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: row.col5 || '', font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
            new TableCell({
              width: { size: columnWidths[5], type: WidthType.DXA },
              children: [
          new Paragraph({
            children: [new TextRun({ text: row.col6 || '', font: 'Noto Sans Devanagari' })],
          }),
              ],
            }),
          ],
        });
      })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 360, bottom: 720, left: 360 },
              size: { orientation: 'landscape' },
            },
          },
          children: [table],
        },
      ],
      styles: {
        paragraphStyles: [
          {
            id: 'default',
            name: 'Default',
            basedOn: 'Normal',
            next: 'Normal',
            run: {
              font: 'Noto Sans Devanagari',
              size: 24,
            },
          },
          {
            id: 'header',
            name: 'Header',
            basedOn: 'Normal',
            run: {
              font: 'Noto Sans Devanagari',
              size: 28,
              bold: true,
            },
          },
        ],
      },
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${tableName}.docx`);
    });
  };

  return (
    <div ref={tableRef} className="text-sm">
      <h2 className="text-lg font-semibold mb-4 flex items-center justify-between gap-6">
      Editable Table
      <button onClick={exportToDocx} className="px-3 py-1 text-xs bg-orange-500 text-white rounded">
        Export to docx
      </button>
      </h2>

      <div className="overflow-x-auto">
      <table className="border-collapse border border-gray-300 w-full text-xs">
        <thead>
        <tr>
          <th className="border border-gray-300 px-1 py-1">Sr.</th>
          <th className="border border-gray-300 px-1 py-1">V.T</th>
          <th className="border border-gray-300 px-1 py-1">Granth</th>
          <th className="border border-gray-300 px-1 py-1">ShastraPath</th>
          <th className="border border-gray-300 px-1 py-1">Pub. Rem</th>
          <th className="border border-gray-300 px-1 py-1">In. Rem</th>
        </tr>
        </thead>
        <tbody>
        {rows.map((row: TableRow, index: number) => (
          <tr key={row.id} className="">
          <td className="border flex flex-col gap-1 border-gray-300 px-1 py-1">
            {index + 1}
            <button
            onClick={() => {
              saveState();
              setRows((prevRows) => prevRows.filter((_, i) => i !== index));
            }}
            className="text-red-500 hover:text-red-700 text-xs"
            >
            🗑️
            </button>
          </td>
          <td className="border border-gray-300 px-1 py-1 w-1/15">
            <select
            value={row.col2 || 'स्व'}
            onChange={(e) => {
              saveState();
              setRows((prevRows) =>
              prevRows.map((r, i) => (i === index ? { ...r, col2: e.target.value } : r))
              );
            }}
            className="w-full border border-gray-300 px-1 py-1 text-xs"
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
          <td className="border border-gray-300 px-1 py-1">
            <textarea
            value={row.col3}
            onClick={() => setSelectedRowIndex(index)}
            onChange={(e) => {
              saveState();
              setRows((prevRows) =>
              prevRows.map((r, i) => (i === index ? { ...r, col3: e.target.value } : r))
              );
            }}
            className="w-full border px-1 border-gray-300 py-1 resize-none text-xs"
            style={{ height: 'auto', minHeight: '10em' }}
            rows={1}
            />
          </td>
          <td className="border border-gray-300 px-1 py-1" style={{ width: '55%' }}>
            <div className="flex flex-col">
            <textarea
              value={row.col4}
              onClick={() => setSelectedRowIndex(index)}
              onChange={(e) => {
              saveState();
              setRows((prevRows) =>
                prevRows.map((r, i) => (i === index ? { ...r, col4: e.target.value } : r))
              );
              }}
              ref={(el) => {
              inputRefs.current[index] = el;
              }}
              className="w-full border border-gray-300 px-1 py-1 resize-none text-xs"
              style={{ height: 'auto', minHeight: '10em' }}
              rows={1}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, index)}
              className="mt-1 text-xs"
            />
            <div className="flex gap-1 mt-1 flex-wrap">
              {(images[index] || []).map((img, imgIndex) => (
              <div key={imgIndex} className="relative">
                <img
                src={img.src}
                alt={`Image ${imgIndex + 1}`}
                className="w-20 h-20 object-cover cursor-pointer"
                onClick={() => setCurrentImage({ rowIndex: index, imageIndex: imgIndex, src: img.src })}
                />
                <button
                onClick={() => {
                  saveState();
                  setImages((prev) => {
                  const updatedImages = { ...prev };
                  updatedImages[index] = updatedImages[index].filter((_, i) => i !== imgIndex);
                  return updatedImages;
                  });
                }}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                >
                ✖
                </button>
              </div>
              ))}
            </div>
            {currentImage && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div
                className="bg-white p-4 rounded shadow-lg relative"
                style={{
                width: '800px',
                height: '800px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                }}
              >
                <button
                onClick={() => setCurrentImage(null)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xs"
                >
                ✖
                </button>
                <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                >
                <img
                  src={currentImage.src}
                  style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  }}
                />
                </ReactCrop>
                <button
                onClick={() => {
                  const image = new Image();
                  image.src = currentImage.src;
                  image.onload = () =>
                  getCroppedImage(image, crop).then((croppedImage) =>
                    handleCropComplete(currentImage.rowIndex, currentImage.imageIndex, croppedImage)
                  );
                }}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
                >
                Crop
                </button>
              </div>
              </div>
            )}
            </div>
          </td>
          <td className="border border-gray-300 px-1 py-1 w-1/10">
            <div className="flex flex-col w-full">
            <select
              value={row.col5.split('=')[0] || ''}
              onChange={(e) => {
              const selectedValue = e.target.value;
              saveState();
              setRows((prevRows) =>
                prevRows.map((r, i) =>
                i === index
                  ? {
                  ...r,
                  col5: selectedValue + (['RA', 'RC', 'RS'].includes(selectedValue) ? '=' : ''),
                  }
                  : r
                )
              );
              }}
              className="w-full border border-gray-300 px-1 py-1 mb-1 text-xs"
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
              onChange={(e) => {
                const newValue = e.target.value;
                saveState();
                setRows((prevRows) =>
                prevRows.map((r, i) =>
                  i === index ? { ...r, col5: row.col5.split('=')[0] + '=' + newValue } : r
                )
                );
              }}
              className="border w-full border-gray-300 px-1 py-1 resize-none text-xs"
              style={{ height: '8em' }}
              rows={1}
              />
            )}
            </div>
          </td>
          <td className="border border-gray-300 px-1 py-1 w-1/10">
            <textarea
            value={row.col6 || ''}
            onClick={() => setSelectedRowIndex(index)}
            onChange={(e) => {
              saveState();
              setRows((prevRows) =>
              prevRows.map((r, i) => (i === index ? { ...r, col6: e.target.value } : r))
              );
            }}
            className="w-full border border-gray-300 px-1 py-1 resize-none text-xs"
            style={{ height: 'auto', minHeight: '10em' }}
            rows={1}
            />
          </td>
          </tr>
        ))}
        </tbody>
      </table>
      <button
        onClick={() => {
        saveState();
        addRow();
        }}
        className="mt-2 px-3 py-1 bg-zinc-500 cursor-pointer text-white rounded text-xs"
      >
        Add Row
      </button>
      </div>
    </div>
  );
};

export default EditableTable;