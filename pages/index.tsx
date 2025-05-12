// pages/index.tsx
import dynamic from 'next/dynamic';
import EditableTable from '../components/EditableTable';

const DocViewerWithUpload = dynamic(() => import('../components/DocViewers'), { ssr: false });

export default function Home() {
  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r border-gray-300">
        <DocViewerWithUpload />
      </div>
      <div className="w-1/2 p-4">
        <EditableTable />
      </div>
    </div>
  );
}
