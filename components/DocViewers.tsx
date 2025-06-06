// components/DocxViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import WebViewer from '@pdftron/webviewer';

const DocxViewer = ({ fileUrl }: { fileUrl: string }) => {
  const viewerDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewerDiv.current) {
      WebViewer(
        {
          path: '/lib', // path to the WebViewer lib directory
          initialDoc: fileUrl,
          enableOfficeEditing: true,
        },
        viewerDiv.current
      ).then((instance) => {
        // You can access the WebViewer instance here
        instance.UI.loadDocument(fileUrl);
      });
    }
  }, [fileUrl]);

  return <div className="h-full w-full" ref={viewerDiv}></div>;
};

const DocUploader = ({ onFileUpload }: { onFileUpload: (file: File) => void }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            onFileUpload(event.target.files[0]);
        }
    };

    return (
        <div className="mb-4">
            <input type="file" accept=".docx,.pdf" onChange={handleFileChange} />
        </div>
    );
};

const DocViewerWithUpload = () => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    const handleFileUpload = (file: File) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
            if (fileReader.result) {
                setFileUrl(fileReader.result as string);
            }
        };
        fileReader.readAsDataURL(file);
    };

    return (
        <div className="h-full w-full">
            <DocUploader onFileUpload={handleFileUpload} />
            {fileUrl && <DocxViewer fileUrl={fileUrl} />}
        </div>
    );
};

export default DocViewerWithUpload;