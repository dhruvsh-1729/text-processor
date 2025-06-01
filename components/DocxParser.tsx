import React from 'react';
import { ParsedSection } from './types';

interface DocxParserProps {
    sections: ParsedSection[];
    onPasteText: (text: string, granth: string) => void;
    addGranth: (granth: string) => void;
}

const DocxParser: React.FC<DocxParserProps> = ({ sections, onPasteText, addGranth }) => {
    const handleTextSelection = (event: React.MouseEvent<HTMLTableCellElement>, sectionText: string, index: number) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        const granth = sections[index].Granth + '\n' + sections[index].Adhyay;
        const onlyGranth = sections[index].Granth;

        if (selectedText) {
            onPasteText(selectedText.split('See Code')[0].trim(), onlyGranth);
            addGranth(granth);
        } else {
            // If no text is selected, fallback to the entire section text
            onPasteText(sectionText.trim().replace(/<br\/>/g, '\n').split('See Code')[0].trim(), onlyGranth);
            addGranth(granth);
        }
    };

    return (
        <div className="overflow-x-auto w-full">
            <h2 className="text-xl font-semibold mb-4">Parsed Sections (Click to Copy)</h2>
            <table className="border border-gray-300 w-full table-fixed">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="w-1/6 border px-2 py-2 text-left">Granth</th>
                        <th className="w-1/6 border px-2 py-2 text-left">Adhyay</th>
                        <th className="w-2/3 border px-2 py-2 text-left">Text</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section, index) => (
                        <tr key={index} className="align-top cursor-pointer hover:bg-gray-100">
                            <td className="w-1/6 border px-2 py-2 break-words">{section.Granth}</td>
                            <td className="w-1/6 border px-2 py-2 break-words">{section.Adhyay}</td>
                            <td
                                className="w-2/3 border px-2 py-2 break-words"
                                dangerouslySetInnerHTML={{ __html: section.Text }}
                                onMouseUp={(event) => handleTextSelection(event, section.Text, index)}
                            ></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DocxParser;
