Hướng Dẫn Kỹ Thuật: Fix Vấn Đề Loading State

Agent hãy thực hiện bước này đầu tiên để cải thiện UX ngay lập tức.

Cài đặt:

npm install nextjs-toploader


Cập nhật src/app/layout.tsx:
Chèn component NextTopLoader vào bên trong body, trước children.

import NextTopLoader from 'nextjs-toploader';

// ... inside RootLayout function ...
return (
  <html lang="en">
    <body className={...}>
      <NextTopLoader
        color="#2299DD"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={false} // Tắt spinner vòng tròn, chỉ dùng thanh bar cho đỡ rối
        easing="ease"
        speed={200}
        shadow="0 0 10px #2299DD,0 0 5px #2299DD"
      />
      {children}
      {/* ... other providers ... */}
    </body>
  </html>
);


Điều này sẽ giải quyết triệt để cảm giác "bấm mà không chạy" trên production.