# Luyện trả lời câu hỏi có tranh

Web app ghép từng ảnh `B-x.jpg` với ảnh `B-x Câu hỏi.jpg`, cho nhập/chỉnh nội dung câu hỏi tiếng Nhật, ẩn/hiện nội dung bằng hiệu ứng blur và đọc từng câu bằng giọng Nhật có sẵn trên trình duyệt.

## Chạy ứng dụng

Cách nhanh nhất trên Windows:

```powershell
.\start_web.bat
```

File này sẽ tự chạy `server.py` rồi mở web tại:

<http://127.0.0.1:8000>

Hoặc chạy thủ công:

```powershell
python server.py
```

Sau đó mở:

<http://127.0.0.1:8000>

Nếu muốn mở từ máy khác cùng Wi-Fi/LAN, dùng địa chỉ IP của máy đang chạy server, ví dụ:

<http://192.168.1.20:8000>

Ghi chú: `server.py` phải đang chạy để app đọc và lưu nội dung trong `questions.json`.

## Cách dùng

1. Chọn bộ đề ở góc trên bên phải.
2. Quan sát tranh, sau đó bấm **Hiện ảnh câu hỏi** để xem ảnh câu hỏi tương ứng.
3. Nội dung trong ô nhập mặc định đang bị ẩn/blur. Bấm **Hiện nội dung** nếu muốn xem hoặc chỉnh sửa.
4. Nhập hoặc sửa câu hỏi tiếng Nhật trong ô **Nội dung để đọc** nếu cần.
5. Chọn giọng đọc và tốc độ.
6. Bấm **Đọc câu 1**, **Đọc câu 2** hoặc **Đọc câu 3** để nghe từng câu riêng.
7. Bấm **Dừng** nếu muốn dừng giọng đọc.

App tự lưu nội dung vào `questions.json` sau khi bạn ngừng gõ khoảng nửa giây. Nội dung được lưu riêng theo từng bộ đề.

Các bộ B-9, B-54 và B-80 hiện chưa có file ảnh câu hỏi tương ứng.
