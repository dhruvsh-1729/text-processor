import { useState, useRef, useEffect } from 'react';

interface TableRow {
  id: number;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
}

const EditableTable = () => {
  const [rows, setRows] = useState<TableRow[]>([
    { id: 1, col1: '', col2: '', col3: '', col4: '', col5: '' },
  ]);

  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    // Focus the third column of the last row
    const lastIndex = rows.length - 1;
    inputRefs.current[lastIndex]?.focus();
  }, [rows]);

  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    rowIndex: number
  ) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    setRows((prevRows) =>
      prevRows.map((row, index) =>
        index === rowIndex ? { ...row, col3: pasteData } : row
      )
    );
  };

  const handleInput = (
    e: React.FormEvent<HTMLTextAreaElement>,
    rowIndex: number
  ) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto'; // Reset height to auto to calculate the new height
    target.style.height = `${target.scrollHeight}px`; // Set height based on scrollHeight

    // Update the corresponding row's col3 value
    const updatedValue = target.value;
    setRows((prevRows) =>
      prevRows.map((row, index) =>
        index === rowIndex ? { ...row, col3: updatedValue } : row
      )
    );
  };

  const addRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      { id: prevRows.length + 1, col1: '', col2: '', col3: '', col4: '', col5: '' },
    ]);
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">Column 1</th>
            <th className="border border-gray-300 px-4 py-2">Column 2</th>
            <th className="border border-gray-300 px-4 py-2">Column 3</th>
            <th className="border border-gray-300 px-4 py-2">Column 4</th>
            <th className="border border-gray-300 px-4 py-2">Column 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="border border-gray-300 px-4 py-2">{row.col1}</td>
              <td className="border border-gray-300 px-4 py-2">{row.col2}</td>
              <td className="border border-gray-300 px-4 py-2">
                <textarea
                  value={row.col3}
                  onChange={(e) => handleInput(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  className="w-full border border-gray-300 px-2 py-1 resize-none"
                  style={{ height: 'auto', minHeight: '20em' }}
                  rows={1} // Start with a single row
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">{row.col4}</td>
              <td className="border border-gray-300 px-4 py-2">{row.col5}</td>
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
  );
};

export default EditableTable;
