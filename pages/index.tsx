import React, { useState } from 'react';
import EditableTable from '../components/EditableTable';
import DocxParser from '../components/DocxParser';
import { ParsedSection, TableRow } from '../components/types';
import mammoth from 'mammoth';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<Array<{ fileName: string; sections: ParsedSection[] }>>([]);
  const [activeDocTab, setActiveDocTab] = useState<number | null>(null);
  const [tables, setTables] = useState<Array<{ rows: TableRow[]; selectedRowIndex: number | null }>>([
    {
      rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
      selectedRowIndex: null,
    },
  ]);
  const [activeTableTab, setActiveTableTab] = useState<number>(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (
      selectedFile &&
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      setFile(selectedFile);
    } else {
      alert('Please upload a valid .docx file');
    }
  };

  const addRow = () => {
    setTables((prevTables) => {
      const newTables = [...prevTables];
      const activeTable = { ...newTables[activeTableTab] };
      const newRow = {
        id: activeTable.rows.length + 1,
        col1: '',
        col2: 'स्व',
        col3: '',
        col4: '\n',
        col5: '',
        col6: '',
      };
      activeTable.rows = [...activeTable.rows, newRow];
      newTables[activeTableTab] = activeTable;
      return newTables;
    });
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

      const lines = Array.from(wrapper.querySelectorAll('p')).map((p) => p.textContent?.trim() || '');

      let granth = '',
        adhyay = '',
        pointers = '',
        textLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('ग्रंथ :-')) {
          granth = line.replace('ग्रंथ :-', '').trim();
          granth = granth.split('(प्रकाशक')[0].trim();
        } else if (line.startsWith('Adhyay :-')) adhyay = line.replace('Adhyay :-', '').trim();
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

    setDocs((prevDocs) => {
      const newDocs = [...prevDocs, { fileName: file.name, sections: parsed }];
      setActiveDocTab(newDocs.length - 1);
      return newDocs;
    });
    setFile(null); // Reset file input after upload
  };

  const addTableTab = () => {
    setTables((prevTables) => {
      const newTables = [
        ...prevTables,
        {
          rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
          selectedRowIndex: null,
        },
      ];
      setActiveTableTab(newTables.length - 1);
      return newTables;
    });
  };

  const handlePasteFromParsed = (text: string) => {
    setTables((prevTables) => {
      const newTables = [...prevTables];
      const activeTable = newTables[activeTableTab];
      const selectedRowIndex = activeTable.selectedRowIndex;

      if (selectedRowIndex !== null) {
        const row = activeTable.rows[selectedRowIndex];
        const regex = /\(क्र\.-[^\)]+\)/g;
        const clippedText = text.match(regex)?.join(' ') || '';
        const remainingText = text.replace(regex, '').trim();

        const existingNumbers = row.col6 ? row.col6.split('\n').map((item) => item.trim()) : [];
        const newNumbers = clippedText.split(' ').map((item) => item.trim()).filter((item) => item !== '');

        const hasDifferentNumber = newNumbers.some((num) => !existingNumbers.includes(num));

        const updatedRow = {
          ...row,
          col4: `${row.col4 && row.col4.trim().includes(remainingText) 
            ? row.col4.trim() 
            : `${row.col4?.trim() || ''}${hasDifferentNumber && row.col4?.trim() ? '......................' : ''}\n${remainingText}`}`,
          col6: row.col6
            ? Array.from(new Set([...existingNumbers, ...newNumbers]))
              .filter((text) => text.trim() !== '')
              .join('\n')
            : clippedText,
        };

        activeTable.rows = activeTable.rows.map((r, idx) => (idx === selectedRowIndex ? updatedRow : r));
      }
      return newTables;
    });
  };

  const addGranth = (granth: string) => {
    setTables((prevTables) => {
      const newTables = [...prevTables];
      const activeTable = newTables[activeTableTab];
      const selectedRowIndex = activeTable.selectedRowIndex;

      if (selectedRowIndex !== null) {
        const row = activeTable.rows[selectedRowIndex];
        const [newGranth, newAdhyay] = granth.split('\n').map((item) => item.trim());

        const existingText = row.col3.trim();
        const existingGranths = existingText ? existingText.split('\n\n').map((block) => block.trim()) : [];

        const granthIndex = existingGranths.findIndex((block) => block.startsWith(newGranth));

        if (granthIndex !== -1) {
          const granthBlock = existingGranths[granthIndex];
          const [existingGranth, ...existingAdhyays] = granthBlock.split('\n').map((line) => line.trim());

          if (!existingAdhyays.includes(newAdhyay)) {
            existingGranths[granthIndex] = `${existingGranth}\n${[...existingAdhyays, newAdhyay].join('\n')}`;
          }
        } else {
          existingGranths.push(`${newGranth}\n${newAdhyay}`);
        }

        const updatedRow = {
          ...row,
          col3: existingGranths.join('\n\n'),
        };

        activeTable.rows = activeTable.rows.map((r, idx) => (idx === selectedRowIndex ? updatedRow : r));
      }
      return newTables;
    });
  };

  return (
    <div className="h-screen flex gap-4 p-6 overflow-hidden bg-zinc-100">
      {/* Left Section: Document Tabs */}
      <div className="w-2/5 flex flex-col min-h-0 overflow-hidden bg-white shadow-md rounded-lg">
      <div className="flex-shrink-0 p-4 border-b border-zinc-200">
        {/* <h1 className="text-xl font-semibold text-zinc-800 mb-4">Upload a .docx File</h1> */}
        <div className="flex gap-4 items-center">
        <input
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="border border-zinc-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
        <button
          onClick={handleUpload}
          className="bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          Upload
        </button>
        </div>
      </div>
      <div className="flex-shrink-0 p-4 border-b border-zinc-200">
        <div className="tabs flex gap-2 flex-wrap">
        {docs.map((doc, index) => (
          <button
          key={index}
          onClick={() => setActiveDocTab(index)}
          className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
            activeDocTab === index
            ? 'bg-zinc-800 text-white'
            : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
          }`}
          >
          {doc.fileName}
          </button>
        ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeDocTab !== null && docs[activeDocTab] && (
        <DocxParser
          sections={docs[activeDocTab].sections}
          onPasteText={handlePasteFromParsed}
          addGranth={addGranth}
        />
        )}
      </div>
      </div>

      {/* Right Section: Table Tabs */}
      <div className="w-3/5 flex flex-col min-h-0 overflow-hidden bg-white shadow-md rounded-lg">
      <div className="flex-shrink-0 p-4 border-b border-zinc-200">
        <div className="tabs flex gap-2 flex-wrap">
        {tables.map((_, index) => (
          <button
          key={index}
          onClick={() => setActiveTableTab(index)}
          className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
            activeTableTab === index
            ? 'bg-zinc-800 text-white'
            : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
          }`}
          >
          Table {index + 1}
          </button>
        ))}
        <button
          onClick={addTableTab}
          className="px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          Add Table
        </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tables[activeTableTab] && (
        <EditableTable
          rows={tables[activeTableTab].rows}
          selectedRowIndex={tables[activeTableTab].selectedRowIndex}
          setSelectedRowIndex={(index) =>
          setTables((prev) => {
            const newTables = [...prev];
            newTables[activeTableTab].selectedRowIndex = index;
            return newTables;
          })
          }
          setRows={(newRows) =>
          setTables((prev) => {
            const newTables = [...prev];
            newTables[activeTableTab].rows =
            typeof newRows === 'function'
              ? newRows(newTables[activeTableTab].rows)
              : newRows;
            return newTables;
          })
          }
          addRow={addRow}
        />
        )}
      </div>
      </div>
    </div>
  );
};

export default App;