# VSMov Movie Website — Google AI Studio Prompt Pack

Bộ prompt này được thiết kế để build một web phim hiện đại theo từng phase thay vì yêu cầu AI tạo toàn bộ project trong một lần.

## Thứ tự sử dụng

1. `00_MASTER_SPEC.md`
2. `01_API_ARCHITECTURE.md`
3. `02_DESIGN_SYSTEM.md`
4. `03_HOME_PAGE.md`
5. `04_MOVIE_DETAIL.md`
6. `05_MOVIE_PLAYER.md`
7. `06_SEARCH_DISCOVERY.md`
8. `07_RESPONSIVE_MOBILE.md`
9. `08_PERFORMANCE_SEO.md`
10. `09_FULL_QA.md`
11. `10_ANDROID_TV.md`

## Cách dùng khuyến nghị

- Đặt `00_MASTER_SPEC.md` vào project dưới tên `docs/MASTER_SPEC.md`.
- Mỗi lần chỉ gửi **một prompt phase** cho Google AI Studio.
- Sau khi AI hoàn thành một phase:
  - kiểm tra bằng trình duyệt,
  - chạy lint/typecheck/build,
  - sửa lỗi,
  - commit Git,
  - rồi mới sang phase tiếp theo.
- Không gửi `10_ANDROID_TV.md` cho đến khi web desktop/mobile đã ổn định.
- Nếu AI Studio có thể đọc file trong workspace, luôn yêu cầu nó đọc `docs/MASTER_SPEC.md` trước.
- Nếu không thể đọc file, paste Master Spec ở phiên đầu, sau đó dùng prompt phase tương ứng.

## Nguồn API

Official docs: https://vsmov.com/api-document

Base API:

```text
https://vsmov.com/api
```

Các endpoint public dùng prefix `/api`, JSON, GET, không cần token theo tài liệu hiện tại.

## Git workflow gợi ý

```bash
git add .
git commit -m "feat: complete phase XX"
```

Commit sau từng phase giúp rollback dễ dàng nếu AI ở phase sau làm hỏng UI hoặc logic.
