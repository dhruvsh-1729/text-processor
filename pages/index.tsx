import React, { useEffect, useState } from 'react';
import EditableTable from '../components/EditableTable';
import DocxParser from '../components/DocxParser';
import { ParsedSection, TableRow } from '../components/types';
import mammoth from 'mammoth';
import { Crop } from 'react-image-crop';
import BugModal from '@/components/BugModal';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<Array<{ fileName: string; sections: ParsedSection[] }>>([]);
  const [activeDocTab, setActiveDocTab] = useState<number | null>(null);
  const [hiddenLeft, setHiddenLeft] = useState<boolean>(false);
  const [hiddenRight, setHiddenRight] = useState<boolean>(false);
  const [sections, setSections] = useState<Array<{
    name: string;
    tables: Array<{
      rows: TableRow[];
      selectedRowIndex: number | null;
      images: { [key: number]: { originalSrc: string; croppedSrc: string; crop: Crop }[] };
      name: string;
    }>;
  }>>([{
    name: 'Section 1',
    tables: [{
      rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
      selectedRowIndex: null,
      images: {},
      name: 'Table 1'
    }]
  }]);
  const [activeSectionTab, setActiveSectionTab] = useState<number | null>(0);
  const [activeTableTab, setActiveTableTab] = useState<number | null>(0);
  const [openBugModal, setOpenBugModal] = useState<boolean>(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setDocs(parsedState.docs || []);
      setSections(parsedState.sections || [{
        name: 'Section 1',
        tables: [{
          rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
          selectedRowIndex: null,
          images: {},
          name: 'Table 1'
        }]
      }]);
      setActiveDocTab(parsedState.activeDocTab ?? null);
      setActiveSectionTab(parsedState.activeSectionTab ?? 0);
      setActiveTableTab(parsedState.activeTableTab ?? 0);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    const stateToSave = {
      docs,
      sections,
      activeDocTab,
      activeSectionTab,
      activeTableTab,
    };
    try {
      localStorage.setItem('appState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, [docs, sections, activeDocTab, activeSectionTab, activeTableTab]);

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
    if (activeSectionTab === null || activeTableTab === null) return;
    setSections((prevSections) => {
      const newSections = prevSections.map((section, sectionIndex) => {
        if (sectionIndex === activeSectionTab) {
          const updatedTables = section.tables.map((table, tableIndex) => {
            if (tableIndex === activeTableTab) {
              const newRow = {
                id: table.rows.length + 1,
                col1: '',
                col2: 'स्व',
                col3: '',
                col4: '\n',
                col5: '',
                col6: '',
              };
              return {
                ...table,
                rows: [...table.rows, newRow],
              };
            }
            return table;
          });
          return {
            ...section,
            tables: updatedTables,
          };
        }
        return section;
      });
      return newSections;
    });
  };

  const handleUpload = async () => {
    if (!file) {
      alert('No file selected');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.convertToHtml({ arrayBuffer });

    let fileType = file.name.includes("SP") ? "SP" : "APC";
    let sectionSplitter;
    if (fileType === "SP") {
      sectionSplitter = /(?<=क्रम :-)/;
    } else {
      sectionSplitter = /(?=<p>ग्रंथ :-)/;
    }

    const rawSections = value.split(sectionSplitter);
    const parsed: ParsedSection[] = rawSections.map((sectionHtml) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sectionHtml;

      const lines = Array.from(wrapper.querySelectorAll('p')).map((p) => p.textContent?.trim() || '');

      let granth = '',
        adhyay = '',
        pointers = '',
        textLines: string[] = [];

      for (const line of lines) {
        if (fileType === "SP") {
          if (line.startsWith('क्रम :-')) {
            pointers = line.replace('क्रम :-', '').trim();
          } else if (line.startsWith('ग्रंथ :-')) {
            granth = line.replace('ग्रंथ :-', '').trim();
            granth = granth.split('(प्रकाशक')[0].trim();
            if (pointers) {
              granth = `${granth}\n${pointers}`;
              pointers = '';
            }
          } else if (line.startsWith('Adhyay :-')) {
            adhyay = line.replace('Adhyay :-', '').trim();
          } else if (line.startsWith('स्थान :-')) {
            if (!adhyay) {
              adhyay = line.replace('स्थान :-', '').trim();
            }
          } else {
            textLines.push(line);
          }
        } else {
          if (line.startsWith('ग्रंथ :-')) {
            granth = line.replace('ग्रंथ :-', '').trim();
            granth = granth.split('(प्रकाशक')[0].trim();
          } else if (line.startsWith('Adhyay :-')) {
            adhyay = line.replace('Adhyay :-', '').trim();
          } else if (line.startsWith('Pointers :-')) {
            pointers = line.replace('Pointers :-', '').trim();
          } else {
            textLines.push(line);
          }
        }
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
    setFile(null);
  };

  const addTableTab = () => {
    if (activeSectionTab === null) return;
    setSections((prevSections) => {
      const newSections = [...prevSections];
      const activeSection = { ...newSections[activeSectionTab] };
      activeSection.tables = [
        ...activeSection.tables,
        {
          rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
          selectedRowIndex: null,
          images: {},
          name: `Table ${activeSection.tables.length + 1}`,
        },
      ];
      newSections[activeSectionTab] = activeSection;
      setActiveTableTab(activeSection.tables.length - 1);
      return newSections;
    });
  };

  const addSectionTab = () => {
    setSections((prevSections) => {
      const newSections = [
        ...prevSections,
        {
          name: `Section ${prevSections.length + 1}`,
          tables: [{
            rows: [{ id: 1, col1: '', col2: 'स्व', col3: '', col4: '\n', col5: '', col6: '' }],
            selectedRowIndex: null,
            images: {},
            name: 'Table 1',
          }],
        },
      ];
      setActiveSectionTab(newSections.length - 1);
      setActiveTableTab(0);
      return newSections;
    });
  };

  const handlePasteFromParsed = (text: string, granth: string) => {
    if (activeSectionTab === null || activeTableTab === null) return;
    setSections((prevSections) => {
      const newSections = [...prevSections];
      const activeSection = newSections[activeSectionTab];
      const activeTable = activeSection.tables[activeTableTab];
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
          col4: `\n${row.col4?.trim()
            ? `${row.col4.trim().includes(remainingText)
              ? row.col4.trim()
              : `${row.col4.trim()}${hasDifferentNumber ? '......................\n' : '\n'}${remainingText}`}`
            : remainingText}`,
          col6: `\n${row.col6
            ? Array.from(new Set([...existingNumbers, ...newNumbers]))
              .filter((text) => text.trim() !== '')
              .join('\n')
            : clippedText}${hasDifferentNumber ? `\n${granth}` : ''}`,
        };

        activeTable.rows = activeTable.rows.map((r, idx) => (idx === selectedRowIndex ? updatedRow : r));
      }
      return newSections;
    });
  };

  const addGranth = (granth: string) => {
    if (activeSectionTab === null || activeTableTab === null) return;
    setSections((prevSections) => {
      const newSections = [...prevSections];
      const activeSection = newSections[activeSectionTab];
      const activeTable = activeSection.tables[activeTableTab];
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
          col3: `\n${row.col3.trim() === ''
            ? existingGranths.join('\n')
            : existingGranths.join('\n\n')}`,
        };

        activeTable.rows = activeTable.rows.map((r, idx) => (idx === selectedRowIndex ? updatedRow : r));
      }
      return newSections;
    });
  };

  return (
    <div className="h-screen flex gap-4 p-6 overflow-hidden bg-zinc-100">
      <div
        className={`transition-all duration-300 ${hiddenLeft ? 'w-12' : hiddenRight ? 'w-full' : 'w-2/5'} flex flex-col min-h-0 overflow-hidden bg-white shadow-md rounded-lg`}
      >
        <div className="flex-shrink-0 p-4 border-b border-zinc-200 flex items-center justify-between">
          {!hiddenLeft && (
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
          )}
          <button
            onClick={() => setHiddenLeft(!hiddenLeft)}
            className="bg-zinc-800 text-white px-2 py-1 rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            {hiddenLeft ? '>' : '<'}
          </button>
        </div>
        {!hiddenLeft && (
          <>
            <div className="flex-shrink-0 p-4 border-b border-zinc-200">
              <div className="tabs flex gap-2 flex-wrap">
                {docs.map((doc, index) => {
                  const shortFileName = (() => {
                    const fileNameWithoutExtension = doc.fileName.replace(/\.[^/.]+$/, '');
                    return fileNameWithoutExtension.length > 15
                      ? `${fileNameWithoutExtension.slice(0, 6)}...${fileNameWithoutExtension.slice(-6)}`
                      : fileNameWithoutExtension;
                  })();

                  return (
                    <div key={index} className="relative">
                      <button
                        onClick={() => setActiveDocTab(index)}
                        className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 truncate ${activeDocTab === index ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'}`}
                      >
                        {shortFileName}
                      </button>
                      <button
                        onClick={() =>
                          setDocs((prevDocs) => {
                            const newDocs = prevDocs.filter((_, i) => i !== index);
                            if (activeDocTab === index) {
                              setActiveDocTab(newDocs.length > 0 ? 0 : null);
                            } else if (activeDocTab !== null && activeDocTab > index) {
                              setActiveDocTab((prev) => (prev !== null ? prev - 1 : 0));
                            }
                            return newDocs;
                          })
                        }
                        className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
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
          </>
        )}
      </div>

      <div
        className={`transition-all duration-300 ${hiddenRight ? 'w-96' : hiddenLeft ? 'w-full' : 'w-3/5'} flex flex-col min-h-0 overflow-hidden bg-white shadow-md rounded-lg`}
      >
        <div className="flex items-center justify-between gap-2 p-2 border-b border-zinc-200 text-sm">
          <div className="flex items-center gap-2">
            <select
              value={activeSectionTab ?? ''}
              onChange={(e) => {
                const index = parseInt(e.target.value, 10);
                setActiveSectionTab(index);
                setActiveTableTab(sections[index].tables.length > 0 ? 0 : null);
              }}
              className="border border-zinc-300 p-1 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm"
              disabled={sections.length === 0}
            >
              {sections.map((section, index) => (
                <option key={index} value={index}>
                  {section.name}
                </option>
              ))}
            </select>
            <button
              onClick={addSectionTab}
              className="bg-zinc-800 text-white p-2 rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm"
              title="Add Section"
            >
              ➕
            </button>
            {sections.length > 0 ? (
              <>
                <button
                  onClick={() => {
                    const confirmDelete = window.confirm('Are you sure you want to delete this section?');
                    if (!confirmDelete) return;

                    setSections((prevSections) => {
                      const newSections = prevSections.filter((_, i) => i !== activeSectionTab);
                      if (newSections.length > 0) {
                        setActiveSectionTab(0);
                        setActiveTableTab(newSections[0].tables.length > 0 ? 0 : null);
                      } else {
                        setActiveSectionTab(null);
                        setActiveTableTab(null);
                      }
                      return newSections;
                    });
                  }}
                  className="bg-red-500 text-white p-2 rounded hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
                  title="Delete Section"
                >
                  🗑️
                </button>
                <button
                  onClick={() => {
                    const newName = activeSectionTab !== null ? prompt('Enter new section name:', sections[activeSectionTab].name) : null;
                    if (newName) {
                      setSections((prevSections) => {
                        const newSections = [...prevSections];
                        if (activeSectionTab !== null) {
                          newSections[activeSectionTab].name = newName;
                        }
                        return newSections;
                      });
                    }
                  }}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  title="Rename Section"
                >
                  ✏️
                </button>
              </>
            ) : (
              <span className="text-zinc-500 text-sm">No sections available</span>
            )}
            <button
              onClick={() => setHiddenRight(!hiddenRight)}
              className="bg-zinc-800 text-white p-2 rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm"
              title="Toggle View"
            >
              {hiddenRight ? '<' : '>'}
            </button>
          </div>
          <div>
            <button
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 text-sm"
              onClick={() => {
                setOpenBugModal(true);
              }}
            >
              Report bug
            </button>
          </div>
        </div>
        {sections.length > 0 && activeSectionTab !== null && (
          <div className="flex items-center gap-2 p-2 border-b border-zinc-200 text-sm overflow-x-auto">
            {sections[activeSectionTab]?.tables.map((table, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => setActiveTableTab(index)}
                  className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm ${activeTableTab === index ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                    }`}
                >
                  {table.name}
                </button>
                <div className="absolute -top-2 -right-2 flex gap-0.5 text-[10px]">
                  <button
                    onClick={() => {
                      const newName = prompt('Enter new table name:', table.name);
                      if (newName) {
                        setSections((prevSections) => {
                          const newSections = [...prevSections];
                          newSections[activeSectionTab].tables[index].name = newName;
                          return newSections;
                        });
                      }
                    }}
                    className="bg-blue-500 text-white px-0.5 py-0.5 rounded hover:bg-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 text-[10px]"
                    title="Rename Table"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      const confirmDelete = window.confirm('Are you sure you want to delete this table?');
                      if (!confirmDelete) return;

                      setSections((prevSections) => {
                        const newSections = [...prevSections];
                        const activeSection = newSections[activeSectionTab];
                        const newTables = activeSection.tables.filter((_, i) => i !== index);
                        activeSection.tables = newTables;

                        if (newTables.length === 0) {
                          setActiveTableTab(null);
                        } else if (activeTableTab !== null && index <= activeTableTab) {
                          setActiveTableTab((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
                        }

                        return newSections;
                      });
                    }}
                    className="bg-red-500 text-white px-0.5 py-0.5 rounded hover:bg-red-400 focus:outline-none focus:ring-1 focus:ring-red-300 text-[10px]"
                    title="Delete Table"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addTableTab}
              className="px-2 py-1 bg-zinc-800 text-white rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm"
              title="Add Table"
            >
              ➕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSectionTab !== null && activeTableTab !== null && sections[activeSectionTab]?.tables[activeTableTab] ? (
            <EditableTable
              rows={sections[activeSectionTab].tables[activeTableTab].rows}
              selectedRowIndex={sections[activeSectionTab].tables[activeTableTab].selectedRowIndex}
              setSelectedRowIndex={(index) =>
                setSections((prev) => {
                  const newSections = [...prev];
                  newSections[activeSectionTab].tables[activeTableTab].selectedRowIndex = index;
                  return newSections;
                })
              }
              setRows={(newRows) =>
                setSections((prev) => {
                  const newSections = [...prev];
                  newSections[activeSectionTab].tables[activeTableTab].rows =
                    typeof newRows === 'function' ? newRows(newSections[activeSectionTab].tables[activeTableTab].rows) : newRows;
                  return newSections;
                })
              }
              addRow={addRow}
              images={sections[activeSectionTab].tables[activeTableTab].images}
              setImages={(newImages) =>
                setSections((prev) => {
                  const newSections = [...prev];
                  newSections[activeSectionTab].tables[activeTableTab].images =
                    typeof newImages === 'function' ? newImages(newSections[activeSectionTab].tables[activeTableTab].images) : newImages;
                  return newSections;
                })
              }
              tableName={sections[activeSectionTab].tables[activeTableTab].name}
            />
          ) : (
            <div className="text-zinc-500 text-center p-4">No tables available in this section</div>
          )}
        </div>
      </div>

      <BugModal isOpen={openBugModal} onClose={() => setOpenBugModal(false)} />
    </div>
  );
};

export default App;