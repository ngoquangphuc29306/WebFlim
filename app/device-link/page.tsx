import { Suspense } from 'react';
import DeviceLinkApproval from './DeviceLinkApproval';

export default function DeviceLinkPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-[#a3a3a3]">Đang chuẩn bị liên kết TV…</div>}>
      <DeviceLinkApproval />
    </Suspense>
  );
}
