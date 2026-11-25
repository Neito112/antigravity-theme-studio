# Hướng dẫn sáng tạo UI động — Bố cục app & menu lúc sử dụng

> **Phạm vi:** chỉ UI động *bên trong lúc dùng* (menu, nút, panel, tab, modal, toast).
> Không bao gồm màn intro/boot, không gắn với bất kỳ theme SAO hay IP nào.
> Tài liệu này là kim chỉ nam sáng tạo cho mọi thay đổi UI động trong repo này —
> agent và người làm theme đều theo nó, không tự chế easing/duration riêng lẻ.
>
> Nguồn gốc: Material Design 3 Motion, nguyên tắc motion cho UI (Disney 12
> nguyên tắc, bản chuyển thể cho giao diện), thư viện Motion (Framer Motion)
> và các bộ micro-interaction. Xem mục 10.

---

## 1. Nguyên tắc vàng

1. **Motion là công cụ dùng được, không phải trang trí.** Mọi chuyển động phải
   phục vụ ít nhất một trong bốn việc: **phản hồi** (bấm có tín hiệu),
   **liên tục không gian** (người dùng luôn biết mình đang ở đâu),
   **thứ bậc** (cái quan trọng hiện trước), **thích thú** (chỉ khi đã xong ba
   việc trên). Không phục vụ việc nào → bỏ.
2. **Tần suất quyết định cường độ.** Càng gặp thường xuyên thì càng phải ngắn
   và càng nhẹ: nút bấm ≤ 100ms, menu 150–300ms, modal 200–400ms. Chỉ màn
   hình hiếm gặp (onboarding, lần đầu mở) mới được 500ms trở lên.
3. **Vào dài hơn ra.** Phần tử xuất hiện cần thời gian để mắt kịp nhận;
   biến mất thì đi nhanh. Ví dụ: dialog vào 400ms, ra 200ms.
4. **Không bao giờ dùng linear cho UI.** Chuyển động thẳng đều trông như máy.
   Mọi thứ trong đời thực đều tăng tốc rồi giảm tốc.

## 2. Bố cục động — menu phải "ở đúng chỗ" trong không gian

Antigravity có 4 vùng: **sidebar** (điều hướng), **topbar** (nút ✨, trạng
thái), **chat** (nội dung chính), **composer** (ô nhập). Mọi menu/panel động
đều phải giữ được bản đồ không gian này trong đầu người dùng:

- **Menu mọc ra từ đúng điểm đã bấm.** Popover/dropdown xuất hiện từ nút
  kích hoạt: scale từ 0.95 + fade, tâm nở (transform-origin) đặt tại mép
  gần nút nhất. Đóng lại thì thu về đúng chỗ đó. Người dùng luôn biết menu
  từ đâu ra và về đâu.
- **Chuyển tab/mục bằng shared element.** Cái pill/underline trượt theo tab
  đang chọn; nội dung trượt theo trục X khi tiến/lùi, trục Y khi lên/xuống,
  scale 0.8 → 1.0 khi zoom vào (trục Z). Không nhảy cắt đột ngột.
- **Mở chi tiết từ một thẻ bằng container transform.** Thẻ nở ra thành
  trang/panel chi tiết: khung bao, góc bo và kích thước nội suy theo nhau,
  nội dung bên trong cross-fade. Đường nối là chính cái thẻ đó.
- **Nội dung không liên quan thì chỉ fade qua nhau.** Đừng giả vờ có liên hệ
  không gian khi thực tế không có: phần tử cũ fade out hết rồi phần tử mới
  mới fade in (fade through).
- **Panel trượt phải có điểm neo.** Sidebar thu/mở, settings trượt từ phải,
  tray trượt từ dưới — luôn giữ một mép neo cố định để mắt có chỗ bám.

## 3. Menu lúc sử dụng — từng pattern

### 3.1 Dropdown / popover (menu ✨, menu theme, menu chọn model)
- Vào: opacity 0 → 1, scale 0.95 → 1, translateY -4px → 0, 200–300ms,
  emphasized-decelerate. Tâm nở tại mép gần nút bấm.
- Các mục stagger từ trên xuống, mỗi mục cách nhau 40–80ms.
- Ra: 150–200ms, emphasized-accelerate, các mục ra theo thứ tự ngược lại
  (mục vào sau ra trước), scale 0.97 + fade.
- Hover mục: nền sáng lên trong 100ms, không đổi layout (không dịch chữ,
  không đổi kích thước — chỉ đổi màu/độ sáng).

### 3.2 Tab / segmented control (chuyển World, chuyển preset)
- Pill trượt theo tab active bằng FLIP: đo vị trí cũ/mới, dịch bằng
  transform, không animate `left/width`.
- Nội dung tab: shared axis theo hướng di chuyển (trước/sau = trục X).
- Tab đang active luôn có dấu hiệu tĩnh (màu + pill), không chỉ dựa vào
  chuyển động để phân biệt.

### 3.3 Sidebar (thu/mở, đổi mục)
- Thu/mở: 300ms, emphasized; nội dung bên trong fade nhanh hơn khung
  (khung đi trước, chữ theo sau 50ms) để không bị vỡ chữ khi co.
- Đổi mục: mục cũ fade out 150ms, mục mới fade in 200ms kèm translateY
  8px → 0. Không để sidebar "nhảy" chiều cao đột ngột: animate chiều cao
  bằng FLIP hoặc giữ chiều cao cố định trong lúc chuyển.

### 3.4 Modal / settings / theme studio
- Vào: 400ms emphasized-decelerate, scale 0.96 → 1 + fade; scrim (lớp
  phủ tối) fade riêng 200ms.
- Ra: 200ms emphasized-accelerate.
- Focus vào modal ngay khi mở; Esc đóng với đúng animation ra (không cắt
  ngang thành biến mất tức thì).

### 3.5 Command palette / tìm kiếm nhanh
- Mở: 250ms, panel rơi từ trên xuống 12px + fade, ô nhập được focus sẵn.
- Kết quả lọc: item biến mất/appear bằng fade + thu chiều cao (FLIP),
  không để list nhảy giật. Item được chọn có pill trượt theo phím mũi tên.

### 3.6 Context menu (chuột phải)
- Mọc tại vị trí con trỏ, scale 0.95 → 1, 150–200ms. Nếu gần mép màn hình
  thì lật hướng nở (origin đổi sang mép trong) chứ không để menu tràn ra
  ngoài rồi mới sửa.

### 3.7 Toast / thông báo trạng thái (theme đã áp dụng, AI lỗi → fallback)
- Vào: trượt từ dưới lên 16px + fade, 250ms. Tồn tại 4s rồi tự ra:
  fade + trượt xuống, 200ms.
- Toast lỗi (AI không dùng được) khác toast thường bằng màu + icon, không
  chỉ bằng chữ — và luôn có hành động (Thử lại / Xem chi tiết).

### 3.8 Chat: bong bóng, đang nhập, streaming
- Bong bóng mới: fade + translateY 8px → 0, 200ms. Không animate lại toàn
  bộ list khi có tin mới — chỉ item mới.
- Trạng thái "đang nhập": ba chấm nhấp nháy theo nhịp 3 chấm lệch pha
  150ms, dừng ngay khi có nội dung.
- Streaming: chữ hiện dần là đủ, không thêm hiệu ứng cho từng ký tự
  (gây giật và tốn GPU).

## 4. Bảng token — lấy sẵn, dùng luôn, không tự chế

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | mọi thứ **đi vào** |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | mọi thứ **đi ra** |
| `--ease-std` | `cubic-bezier(0.2, 0, 0, 1)` | đổi chỗ tại vị trí, morph |
| `--ease-emph` | `cubic-bezier(0.2, 0, 0, 1)` | transition chính, có điểm nhấn |
| `--ease-emph-out` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | phần tử quan trọng đi vào |
| `--ease-emph-in` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | phần tử quan trọng đi ra |
| `--ease-sharp` | `cubic-bezier(0.4, 0, 0.6, 1)` | snap-back, đóng drawer |
| `--dur-micro` | 100ms | hover/press, đổi trạng thái icon |
| `--dur-short` | 200ms | menu đóng, mục nhỏ, toast ra |
| `--dur-med` | 300ms | menu mở, thẻ mở rộng, sidebar |
| `--dur-long` | 400ms | modal/dialog vào, chuyển trang |
| `--dur-xl` | 450–500ms | chuyển màn hình lớn, container transform |
| `--stagger-item` | 40–80ms | khoảng cách giữa các mục trong list/menu |
| `--stagger-section` | 100–150ms | khoảng cách giữa các khối lớn |

Quy tắc chọn duration: **phần tử càng lớn, đi càng xa thì càng lâu.**
Icon 100ms, nút 100–200ms, card/menu 200–300ms, modal 300–400ms,
full-screen 400–700ms.

## 5. Micro-interaction — nút bấm lúc dùng

- **Hover:** nâng nhẹ (translateY -1px) + sáng lên, 100ms. Chỉ đổi
  màu/độ sáng/transform — không đổi layout.
- **Press:** lún xuống scale 0.95–0.97 trong 100ms, nhả ra trở lại 150ms
  với lò xo nhẹ (overshoot nhỏ). Đây là tín hiệu "đã nhận lệnh" quan trọng
  nhất; nút không có phản hồi press thì cảm giác như đơ.
- **Focus:** vòng focus rõ ràng, hiện ngay khi tab tới (không chờ hover).
  Focus ring animate 100ms, không nhấp nháy.
- **Loading:** spinner/skeleton tại chỗ, giữ nguyên kích thước nút (không
  để nút co lại làm cả hàng nhảy). Disabled: mờ 50%, không hiệu ứng.
- **Toggle/switch:** thumb trượt 200ms emphasized; màu đổi cùng nhịp.
- **Số liệu thay đổi (quota, trạng thái):** số cũ fade/slide ra, số mới
  vào — không nhảy số đột ngột.

## 6. Choreography — dàn dựng nhiều phần tử cùng lúc

- **Một hướng mắt duy nhất.** Dẫn mắt theo một chiều: list dọc thì từ trên
  xuống, hàng ngang thì từ trái sang. Không cho hai nhóm chạy ngược chiều
  nhau cùng lúc.
- **Khung đi trước, nội dung theo sau.** Khung/panel chuyển động trước
  50ms, chữ/nội dung bên trong theo sau — tránh cảm giác chữ bị kéo giãn.
- **Ra ngược với vào.** Thứ tự stagger lúc đóng là ngược lúc mở.
- **Không xếp chồng hiệu ứng lên nhau.** Một phần tử tại một thời điểm chỉ
  có một hiệu ứng chính; hover + press + stagger không chạy đồng thời lên
  cùng một nút.
- **Giảm dần theo tần suất.** Hiệu ứng chỉ đầy đủ lần đầu; các lần sau
  (đặc biệt menu mở/đóng liên tục) rút ngắn 30–50% hoặc bỏ stagger.

## 7. Hiệu năng — giữ 60fps trong engine CDP

Đây là luật cứng của repo này, mọi UI động đều phải tuân theo:

- **Chỉ animate `transform`, `opacity`, `filter`, `clip-path`.** Bốn thứ
  này chạy trên GPU compositor. Không animate `width`, `height`, `top`,
  `left`, `margin`, `background` — chúng bắt trình duyệt tính lại layout
  từng frame.
- **Kính nướng sẵn, không blur lúc chạy.** Mọi panel/menu dùng lớp kính đã
  nướng trước (pre-baked glass) như theme engine hiện tại; không dùng
  `backdrop-filter: blur()` trên phần tử đang animate.
- **FLIP cho thay đổi layout.** Khi một phần tử đổi vị trí/kích thước do
  layout (đổi tab, mở sidebar, lọc list): đo vị trí cũ (First), đặt vị trí
  mới (Last), đảo ngược bằng transform (Invert), rồi animate về 0 (Play).
  Không animate thuộc tính layout trực tiếp.
- **Một canvas/layer cho hiệu ứng hạt (nếu có).** Hiệu ứng trang trí
  (hạt, tia) vẽ trên một canvas duy nhất phủ trên cùng, không tạo layer
  riêng cho từng phần tử.
- **Tôn trọng re-render của Antigravity.** UI gốc render lại liên tục:
  mọi class/animation phải được gắn lại qua MutationObserver sau mỗi lần
  render, và phải idempotent (gắn hai lần cũng như một lần). Không dựa vào
  DOM node cố định — query lại theo selector mỗi lần.
- **Ngân sách:** menu mở/đóng hoàn tất trong 300ms; không có animation
  nào chạy nền vô hạn trừ trạng thái loading/đang nhập; tổng số phần tử
  đang animate cùng lúc < 20.

## 8. Accessibility — không được bỏ

- **`prefers-reduced-motion`:** tắt toàn bộ hiệu ứng chuyển động, giữ lại
  đổi trạng thái tức thì. Đặt duration thành `0.01ms`, **không phải `0`** —
  0 thật sẽ làm mất sự kiện `transitionend` và vỡ máy trạng thái JS.
- **Bàn phím:** mọi menu mở bằng chuột đều mở được bằng phím (Enter/Space
  mở, Esc đóng, mũi tên di chuyển, Tab đi tiếp). Focus luôn thấy được.
- **Không dùng chuyển động làm tín hiệu duy nhất.** Trạng thái (active,
  lỗi, loading) luôn có cả màu + icon + chữ, không chỉ hiệu ứng.

## 9. Checklist nghiệm thu (trước khi báo xong)

- [ ] Mọi menu mở/đóng đều có animation cả hai chiều (không bên nào biến
      mất tức thì).
- [ ] Thời gian đúng bảng token mục 4, không có con số tự chế.
- [ ] Chỉ `transform`/`opacity`/`filter`/`clip-path` bị animate (kiểm tra
      bằng DevTools: không có layout thrashing khi mở/đóng menu 10 lần).
- [ ] Stagger đúng chiều, ra ngược với vào.
- [ ] Mở/đóng menu 10 lần liên tục không giật, không rớt frame dưới 55fps.
- [ ] Tắt/mở lại Antigravity: menu vẫn động (MutationObserver gắn lại).
- [ ] Bật `prefers-reduced-motion`: mọi hiệu ứng tắt, chức năng còn nguyên.
- [ ] `node scripts/verify_cdp.js` PASS và `engineVersion` đúng bản mới.
- [ ] Test trên cả 2 máy (hexa + home) trước khi báo xong.

## 10. Nguồn

- Material Design 3 Motion — easing + duration tokens, container
  transform, shared axis, fade through:
  https://github.com/DanielDevFull/material-design-3-skill/blob/HEAD/material-design-3/references/motion.md
- Micro-interactions & Motion Design — quy tắc quyết định, choreography,
  accessibility, performance:
  https://github.com/Eneryleen/ai-web-design-codex/blob/HEAD/07-aesthetics-and-trends/micro-interactions-and-motion.md
- Motion Principles — Disney 12 nguyên tắc chuyển thể cho UI, easing
  tokens, duration theo kích thước/khoảng cách:
  https://github.com/Intense-Visions/harness-engineering/blob/HEAD/agents/skills/codex/design-motion-principles/SKILL.md
- Motion (Framer Motion) — gestures (whileHover/whileTap), layout & FLIP,
  layoutId shared element, AnimatePresence:
  https://github.com/kusssomax/mk-dev/blob/HEAD/.claude/skills/motion-animations/SKILL.md
