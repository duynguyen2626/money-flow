# Pre-Push TypeScript Validation Hook

## Tự động validate TypeScript trước khi push

### Cài đặt (Windows):

```powershell
# Copy hook vào thư mục git hooks
copy pre-push .git\hooks\pre-push
```

### Cài đặt (Linux/Mac):

```bash
# Copy và set quyền thực thi
cp pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Cách hoạt động:

1. Mỗi khi bạn chạy `git push`, hook sẽ tự động chạy `npx tsc --noEmit`
2. Nếu có lỗi TypeScript, push sẽ bị chặn
3. Fix lỗi → push lại

## Tắt tạm thời (nếu cần):

```bash
git push --no-verify
```

## Lợi ích:

✅ Không bao giờ push code có lỗi TypeScript lên remote
✅ Vercel sẽ không bao giờ fail do lỗi type
✅ Tiết kiệm thời gian debug
