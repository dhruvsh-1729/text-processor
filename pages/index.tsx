import React, { useState } from 'react';
import EditableTable from '../components/EditableTable';
import DocxParser from '../components/DocxParser';
import { ParsedSection, TableRow } from '../components/types';
import mammoth from 'mammoth';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [rows, setRows] = useState<TableRow[]>([
    { id: 1, col1: '', col2: 'स्व', col3: '', col4: '', col5: '' },
  ]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (
      selectedFile &&
      selectedFile.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      setFile(selectedFile);
    } else {
      alert('Please upload a valid .docx file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('No file selected');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.convertToHtml({ arrayBuffer });

    const rawSections = value.split(/(?=<p>ग्रंथ :-)/);

    const parsed: ParsedSection[] = rawSections.map((sectionHtml) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sectionHtml;

      const lines = Array.from(wrapper.querySelectorAll('p')).map(
        (p) => p.textContent?.trim() || ''
      );

      let granth = '',
        adhyay = '',
        pointers = '',
        textLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('ग्रंथ :-')) {
          granth = line.replace('ग्रंथ :-', '').trim();
          granth = granth.split("(प्रकाशक")[0].trim();
        }
        else if (line.startsWith('Adhyay :-')) adhyay = line.replace('Adhyay :-', '').trim();
        else if (line.startsWith('Pointers :-')) pointers = line.replace('Pointers :-', '').trim();
        else textLines.push(line);
      }

      return {
        Granth: granth,
        Adhyay: adhyay,
        Pointers: pointers,
        Text: textLines.join('<br/>'),
      };
    });

    setSections(parsed);
  };

  const handlePasteFromParsed = (text: string) => {
    if (selectedRowIndex !== null) {
      setRows((prevRows) =>
        prevRows.map((row, index) =>
          index === selectedRowIndex
            ? { ...row, col4: row.col4 ? `${row.col4}\n${text}` : text }
            : row
        )
      );
    }
  };

  const addGranth = (granth: string) => {
    if (selectedRowIndex !== null) {
      setRows((prevRows) =>
        prevRows.map((row, index) =>
          index === selectedRowIndex ? { ...row, col3: granth } : row
        )
      );
    }
  }

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: prev.length + 1, col1: '', col2: 'स्व', col3: '', col4: '', col5: '' },
    ]);

  return (
    <div className="h-screen flex gap-4 p-6 overflow-hidden">
      {/* Left Section */}
      <div className="w-1/2 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold mb-4">Upload a .docx File</h1>
          <div className="flex gap-4 items-center">
            <input
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="border border-gray-300 p-2 rounded"
            />
            <button
              onClick={handleUpload}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Parse File
            </button>
          </div>
          {file && <p className="mt-2 text-gray-600">Selected File: {file.name}</p>}
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          <DocxParser sections={sections} onPasteText={handlePasteFromParsed}
            addGranth={addGranth} />
        </div>
      </div>

      {/* Right Section */}
      <div className="w-1/2 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditableTable
            rows={rows}
            selectedRowIndex={selectedRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            setRows={setRows}
            addRow={addRow}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
