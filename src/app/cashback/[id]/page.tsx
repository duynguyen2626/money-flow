'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction, Info } from 'lucide-react';

export default function CashbackDetailsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push('/cashback')}
          className="gap-2 pl-0 hover:pl-2 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cashback List
        </Button>
      </div>

      {/* Main Notice Card */}
      <Card className="border-dashed border-2">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-muted p-4 rounded-full w-fit mb-4">
            <Construction className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Feature Under Reconstruction</CardTitle>
          <CardDescription className="text-lg mt-2">
            Tính năng Chi tiết Hoàn tiền đang được xây dựng lại
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg text-left flex gap-3 items-start max-w-lg mx-auto">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>Chúng tôi phát hiện một số vấn đề hiển thị dữ liệu ở phiên bản trước:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Hiển thị sai danh mục (Category).</li>
                <li>Lỗi ngữ cảnh khi chỉnh sửa giao dịch.</li>
                <li>Nhầm lẫn cột dữ liệu (Notes/Amount).</li>
              </ul>
              <p className="font-medium pt-2">
                Hệ thống đang được viết lại để đảm bảo độ chính xác tuyệt đối cho dòng tiền của bạn.
              </p>
            </div>
          </div>

          <Button onClick={() => router.push('/cashback')}>
            Quay lại danh sách
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}