# Luyện trả lời câu hỏi có tranh

Web app ghép từng ảnh `B-x.jpg` với ảnh `B-x Câu hỏi.jpg`, nhận diện chữ Nhật
trong ảnh và đọc câu hỏi bằng giọng Nhật có sẵn trên máy.

## Chạy ứng dụng

Tại thư mục dự án, chạy:

```powershell
python server.py
```

Sau đó mở <http://localhost:8000>.

Bạn cũng có thể mở giao diện bằng Live Server. Tuy nhiên, `python server.py`
vẫn phải đang chạy để API có thể đọc và ghi file `questions.json`.

## Cách dùng

1. Chọn bộ đề ở góc trên bên phải.
2. Quan sát tranh, sau đó bấm **Hiện ảnh câu hỏi**.
3. Bấm **Nhận chữ từ ảnh**. Lần đầu cần Internet để tải bộ OCR tiếng Nhật.
4. Sửa nội dung nếu OCR nhận sai, chọn giọng/tốc độ và bấm **Đọc câu hỏi**.

Nội dung đã nhận diện hoặc chỉnh sửa được lưu vào file `questions.json` trên
hệ thống theo từng bộ đề. App tự lưu sau khi bạn ngừng gõ khoảng nửa giây.
Các bộ B-9, B-54 và B-80 hiện chưa có file ảnh câu hỏi tương ứng.
