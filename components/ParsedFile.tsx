import React, { useState } from 'react';
import mammoth from 'mammoth';

interface ParsedSection {
  Granth: string;
  Adhyay: string;
  Pointers: string;
  Text: string;
}

const ParsedFile: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<ParsedSection[]>([]);

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

    console.log(`🔹 File selected: ${file.name}`);


    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer });

      const rawSections = value.split(/(?=<p>ग्रंथ :-)/);

      const parsed: ParsedSection[] = rawSections.map((sectionHtml, i) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = sectionHtml;

        const lines = Array.from(wrapper.querySelectorAll('p')).map((p) =>
          p.textContent?.trim() || ''
        );

        let granth = '',
          adhyay = '',
          pointers = '';
        const textLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('ग्रंथ :-')) {
            const fullGranth = line.replace('ग्रंथ :-', '').trim();

            console.log(`🔹 [Section ${i}] Full Granth Line: "${fullGranth}"`);
            const splitByPublisher = fullGranth.split('(प्रकाशक');
            console.log(`🔸 [Section ${i}] Split Result:`, splitByPublisher);

            granth = splitByPublisher[0].trim();
          } else if (line.startsWith('Adhyay :-')) {
            adhyay = line.replace('Adhyay :-', '').trim();
          } else if (line.startsWith('Pointers :-')) {
            pointers = line.replace('Pointers :-', '').trim();
          } else {
            textLines.push(line);
          }
        }

        return {
          Granth: granth,
          Adhyay: adhyay,
          Pointers: pointers,
          Text: textLines.join('<br/>'),
        };
      });

      setSections(parsed);
    } catch (err) {
      console.error('❌ Error parsing file:', err);
      alert('Failed to parse the file.');
    }
  };


  return (
    <div className="p-6">
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

      {sections.length > 0 && (
        <div className="mt-8 overflow-x-auto w-full">
          <h2 className="text-xl font-semibold mb-4">Parsed Sections</h2>
          <table className="border border-gray-300 w-full table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-1/4 border px-2 py-2 text-left">Granth</th>
                <th className="w-1/4 border px-2 py-2 text-left">Adhyay</th>
                <th className="w-1/4 border px-2 py-2 text-left">Pointers</th>
                <th className="w-1/4 border px-2 py-2 text-left">Text</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => (
                <tr key={index} className="align-top">
                  <td className="w-1/4 border px-2 py-2 break-words">{section.Granth}</td>
                  <td className="w-1/4 border px-2 py-2 break-words">{section.Adhyay}</td>
                  <td className="w-1/4 border px-2 py-2 break-words">{section.Pointers}</td>
                  <td
                    className="w-1/4 border px-2 py-2 break-words"
                    dangerouslySetInnerHTML={{ __html: section.Text }}
                  ></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParsedFile;