# Kế hoạch loại bỏ Media Providers, Skills và Remote khỏi ITXBridge

## 1. Mục tiêu

Loại bỏ khỏi dự án ITXBridge các nhóm tính năng sau:

1. **Media Providers**
2. **Skills**
3. **Remote**

Phạm vi ưu tiên:

- Xóa menu và giao diện liên quan.
- Xóa các page không còn sử dụng.
- Xóa API và runtime handlers của Media Providers.
- Giữ nguyên lõi chat/router.
- Không làm hỏng:
  - `/v1/chat/completions`
  - `/v1/models`
  - Provider chat
  - OAuth dùng cho provider chat
  - Streaming SSE
  - Account fallback
  - Model fallback

> Lưu ý: “Remote” trong kế hoạch chính được hiểu là nút quảng bá **9Remote** trong dashboard. Phần Cloudflare Tunnel/Tailscale được tách thành mục tùy chọn riêng.

---

## 2. Nguyên tắc thực hiện

Thực hiện theo thứ tự:

1. Xóa UI và menu.
2. Xóa page.
3. Build kiểm tra.
4. Xóa API media.
5. Xóa application handlers.
6. Xóa `open-sse` media cores.
7. Xóa config không còn được tham chiếu.
8. Build và test lại chat API.

Không nên xóa toàn bộ metadata media khỏi từng provider ngay trong commit đầu tiên, vì provider chat có thể dùng chung:

- OAuth
- Model discovery
- Provider alias
- Web search
- Vision metadata
- Executor

---

## 3. Tạo nhánh làm việc

```bash
git checkout -b cleanup/remove-media-skills-remote
```

Ghi lại commit baseline:

```bash
git rev-parse HEAD > BASELINE_COMMIT
```

Cài dependencies và kiểm tra build trước khi sửa:

```bash
npm install
npm run build
```

Nếu baseline chưa build được, cần lưu lỗi hiện tại để phân biệt với lỗi do thay đổi mới.

---

# PHẦN A — XÓA MEDIA PROVIDERS

## 4. Xóa Media Providers khỏi Sidebar

### File cần sửa

```text
src/shared/components/Sidebar.js
```

### 4.1. Xóa import

Tìm:

```js
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
```

Nếu `MEDIA_PROVIDER_KINDS` được import cùng constant khác:

```js
import {
  MEDIA_PROVIDER_KINDS,
  AI_PROVIDERS,
} from "@/shared/constants/providers";
```

Đổi thành:

```js
import { AI_PROVIDERS } from "@/shared/constants/providers";
```

### 4.2. Xóa các constant phục vụ menu media

Tìm và xóa các constant tương tự:

```js
const VISIBLE_MEDIA_KINDS = ...;
const COMBINED_WEB_ITEM = ...;
```

### 4.3. Xóa state đóng/mở menu media

Tìm và xóa:

```js
const [mediaOpen, setMediaOpen] = useState(...);
```

### 4.4. Xóa block JSX Media Providers

Tìm các chuỗi:

```text
Media Providers
VISIBLE_MEDIA_KINDS
COMBINED_WEB_ITEM
setMediaOpen
/dashboard/media-providers
```

Xóa toàn bộ accordion/menu liên quan.

### Kiểm tra

```bash
git grep -n "MEDIA_PROVIDER_KINDS" src/shared/components/Sidebar.js
git grep -n "dashboard/media-providers" src/shared/components/Sidebar.js
```

Hai lệnh trên không được còn kết quả.

---

## 5. Xóa Media Providers khỏi Header

### File cần sửa

```text
src/shared/components/Header.js
```

### 5.1. Xóa import media constants

Tìm:

```js
import {
  MEDIA_PROVIDER_KINDS,
  AI_PROVIDERS,
} from "@/shared/constants/providers";
```

Đổi thành:

```js
import { AI_PROVIDERS } from "@/shared/constants/providers";
```

### 5.2. Xóa logic title/breadcrumb

Xóa các nhánh xử lý đường dẫn:

```text
/dashboard/media-providers/[kind]
/dashboard/media-providers/[kind]/[id]
/dashboard/media-providers/combo/[id]
/dashboard/media-providers/web
```

Các pattern cần tìm:

```js
pathname.startsWith("/dashboard/media-providers")
pathname.includes("/media-providers/")
```

### Kiểm tra

```bash
git grep -n "media-providers" src/shared/components/Header.js
```

Kết quả phải rỗng.

---

## 6. Xóa pages của Media Providers

Chạy:

```bash
git rm -r 'src/app/(dashboard)/dashboard/media-providers'
```

Dự kiến xóa các nhóm page:

```text
src/app/(dashboard)/dashboard/media-providers/
├── [kind]/
├── combo/
└── web/
```

### Kiểm tra

```bash
test ! -d 'src/app/(dashboard)/dashboard/media-providers'
```

---

## 7. Xóa constant `MEDIA_PROVIDER_KINDS`

### File cần sửa

```text
src/shared/constants/providers.js
```

Tìm và xóa:

```js
export const MEDIA_PROVIDER_KINDS = [
  // ...
];
```

Không xóa toàn bộ file vì file này còn metadata của provider chat.

### Kiểm tra

```bash
git grep -n "MEDIA_PROVIDER_KINDS"
```

Kết quả phải rỗng.

---

## 8. Build sau khi xóa UI Media Providers

```bash
npm run build
```

Nếu có lỗi import:

```bash
git grep -n "dashboard/media-providers"
git grep -n "MEDIA_PROVIDER_KINDS"
```

Xử lý hết import hoặc route reference còn sót trước khi tiếp tục.

---

## 9. Xóa API Media Providers

Chạy:

```bash
git rm -r \
  src/app/api/media-providers \
  src/app/api/v1/audio \
  src/app/api/v1/embeddings \
  src/app/api/v1/images \
  src/app/api/v1/search \
  src/app/api/v1/web
```

Các endpoint dự kiến bị loại bỏ:

```text
POST /v1/embeddings
POST /v1/images/generations
POST /v1/audio/speech
POST /v1/audio/transcriptions
POST /v1/search
POST /v1/web/fetch
```

Sau khi xóa, các endpoint này nên trả về `404`.

---

## 10. Xóa API model theo media kind

Chạy:

```bash
git rm -r 'src/app/api/v1/models/[kind]'
```

Giữ lại:

```text
src/app/api/v1/models/route.js
src/app/api/v1/models/info/
```

Các endpoint theo media kind dự kiến bị xóa:

```text
/v1/models/image
/v1/models/tts
/v1/models/stt
/v1/models/embedding
/v1/models/image-to-text
/v1/models/web
```

---

## 11. Sửa `/v1/models` để chỉ trả model chat

### File cần sửa

```text
src/app/api/v1/models/route.js
```

### 11.1. Xóa ngoại lệ `imageToText` trong custom model filter

Tìm đoạn tương tự:

```js
if (
  !kindFilter.includes(kind) &&
  !(kind === "imageToText" && kindFilter.includes(LLM_KIND))
) {
  return false;
}
```

Đổi thành:

```js
if (!kindFilter.includes(kind)) {
  return false;
}
```

### 11.2. Xóa ngoại lệ `imageToText` trong model loop

Tìm:

```js
const allowAsLlm =
  kind === "imageToText" && kindFilter.includes(LLM_KIND);

if (!kindFilter.includes(kind) && !allowAsLlm) continue;
```

Đổi thành:

```js
if (!kindFilter.includes(kind)) continue;
```

### 11.3. Chưa cần xóa các helper phân loại model

Có thể giữ:

```text
MODEL_TYPE_TO_KIND
modelKind()
inferKindFromUnknownModelId()
providerMatchesKinds()
buildModelsList()
```

Các helper này vẫn hữu ích để loại model media khỏi danh sách LLM.

---

## 12. Xóa application handlers của media

Chạy:

```bash
git rm \
  src/sse/handlers/embeddings.js \
  src/sse/handlers/imageGeneration.js \
  src/sse/handlers/tts.js \
  src/sse/handlers/stt.js \
  src/sse/handlers/search.js \
  src/sse/handlers/fetch.js
```

Không xóa handler chat, messages hoặc responses.

### Kiểm tra import còn sót

```bash
git grep -nE \
  'handlers/(embeddings|imageGeneration|tts|stt|search|fetch)'
```

Xóa hoặc sửa các import còn tồn tại.

---

## 13. Xóa media runtime trong `open-sse`

### 13.1. Xóa provider handler directories

```bash
git rm -r \
  open-sse/handlers/embeddingProviders \
  open-sse/handlers/imageProviders \
  open-sse/handlers/ttsProviders \
  open-sse/handlers/search \
  open-sse/handlers/fetch
```

### 13.2. Xóa media core handlers

```bash
git rm \
  open-sse/handlers/embeddingsCore.js \
  open-sse/handlers/imageGenerationCore.js \
  open-sse/handlers/sttCore.js \
  open-sse/handlers/ttsCore.js
```

### Không xóa

```text
open-sse/handlers/chatCore.js
open-sse/executors/
open-sse/translator/
open-sse/services/accountFallback.js
open-sse/services/model.js
```

Đây là các thành phần lõi của chat/router.

---

## 14. Xóa media config không còn được dùng

Các file cần kiểm tra:

```text
open-sse/config/mediaConfig.js
open-sse/config/googleTtsLanguages.js
open-sse/config/ttsModels.js
```

Tìm nơi còn import:

```bash
git grep -nE \
  'mediaConfig|googleTtsLanguages|ttsModels'
```

Nếu kết quả chỉ còn chính các file trên thì xóa:

```bash
git rm \
  open-sse/config/mediaConfig.js \
  open-sse/config/googleTtsLanguages.js \
  open-sse/config/ttsModels.js
```

Nếu còn import từ provider chat hoặc shared config, chưa xóa cho tới khi xác minh tác động.

---

## 15. Chưa xóa metadata media trong provider registry

Trong:

```text
src/shared/constants/providers.js
open-sse/providers/
```

Có thể còn các field:

```text
serviceKinds
ttsConfig
searchConfig
fetchConfig
imageConfig
embeddingConfig
```

Trong giai đoạn đầu, nên giữ nguyên các field này.

Lý do:

- Có provider chat dùng chung OAuth.
- Có provider dùng chung model discovery.
- Một số provider chat có web search.
- Xóa nhầm có thể làm hỏng alias hoặc executor.

Cleanup metadata nên là một commit riêng sau khi toàn bộ test đã chạy ổn định.

---

# PHẦN B — XÓA SKILLS

## 16. Xóa menu Skills khỏi Sidebar

### File cần sửa

```text
src/shared/components/Sidebar.js
```

Trong danh sách menu, thường là:

```js
const systemItems = [
  // ...
];
```

Xóa item có:

```js
{
  name: "Skills",
  href: "/dashboard/skills",
  // ...
}
```

Tìm chính xác bằng:

```bash
git grep -n '"/dashboard/skills"' src
```

---

## 17. Xóa breadcrumb/title Skills khỏi Header

### File cần sửa

```text
src/shared/components/Header.js
```

Xóa nhánh tương tự:

```js
if (pathname === "/dashboard/skills") {
  // ...
}
```

hoặc:

```js
pathname.includes("/skills")
```

### Kiểm tra

```bash
git grep -n "dashboard/skills" src/shared/components/Header.js
```

---

## 18. Xóa page và constants Skills

Chạy:

```bash
git rm -r 'src/app/(dashboard)/dashboard/skills'
git rm src/shared/constants/skills.js
```

---

## 19. Xóa thư mục Markdown Skills

Chạy:

```bash
git rm -r skills
```

Các tài liệu dự kiến bị xóa có thể gồm:

```text
itxbridge-chat
itxbridge-embeddings
itxbridge-image
itxbridge-stt
itxbridge-tts
web-search
web-fetch
```

### Kiểm tra

```bash
git grep -niE \
  'dashboard/skills|constants/skills|itxbridge-chat|itxbridge-embeddings'
```

Các kết quả còn trong README hoặc changelog không ảnh hưởng build nhưng nên được dọn ở commit tài liệu.

---

# PHẦN C — XÓA 9REMOTE PROMO

## 20. Xóa Remote khỏi Sidebar

### File cần sửa

```text
src/shared/components/Sidebar.js
```

### 20.1. Xóa import

Tìm và xóa:

```js
import NineRemotePromoModal from "./NineRemotePromoModal";
```

Nếu có:

```js
import NineRemoteButton from "./NineRemoteButton";
```

cũng xóa.

### 20.2. Xóa state modal

Tìm và xóa:

```js
const [showRemoteModal, setShowRemoteModal] = useState(false);
```

### 20.3. Xóa nút Remote

Tìm:

```js
setShowRemoteModal(true)
```

Xóa toàn bộ button hoặc menu item chứa text:

```text
Remote
9Remote
```

### 20.4. Xóa modal

Tìm và xóa:

```jsx
<NineRemotePromoModal
  isOpen={showRemoteModal}
  onClose={() => setShowRemoteModal(false)}
/>
```

---

## 21. Xóa component 9Remote

Chạy:

```bash
git rm \
  src/shared/components/NineRemoteButton.js \
  src/shared/components/NineRemotePromoModal.js
```

### Kiểm tra

```bash
git grep -nE \
  'NineRemote|9remote\.cc|showRemoteModal'
```

Kết quả trong `src/` phải rỗng.

---

# PHẦN D — TÙY CHỌN: XÓA TOÀN BỘ REMOTE ACCESS

Chỉ thực hiện phần này nếu “Remote” bao gồm cả:

- Cloudflare Tunnel
- Tailscale
- Tunnel status
- Enable/disable remote access

## 22. Xóa API tunnel và runtime

```bash
git rm -r \
  src/app/api/tunnel \
  src/lib/tunnel
```

## 23. Tìm UI còn gọi tunnel

```bash
git grep -nE \
  '/api/tunnel|@/lib/tunnel|tailscale|cloudflared' \
  src
```

Xóa các section/component gọi:

```text
/api/tunnel/enable
/api/tunnel/disable
/api/tunnel/status
/api/tunnel/tailscale-*
```

> Không thực hiện phần này nếu chỉ muốn bỏ nút quảng bá 9Remote.

---

# PHẦN E — CHIA COMMIT

## 24. Commit 1: UI, Skills và Remote promo

Xóa pages và files:

```bash
git rm -r \
  'src/app/(dashboard)/dashboard/media-providers' \
  'src/app/(dashboard)/dashboard/skills' \
  skills

git rm \
  src/shared/constants/skills.js \
  src/shared/components/NineRemoteButton.js \
  src/shared/components/NineRemotePromoModal.js
```

Sửa tay:

```text
src/shared/components/Sidebar.js
src/shared/components/Header.js
src/shared/constants/providers.js
```

Build:

```bash
npm run build
```

Commit:

```bash
git add -A
git commit -m "remove media, skills and 9remote dashboard features"
```

---

## 25. Commit 2: Media APIs và runtime

Xóa APIs:

```bash
git rm -r \
  src/app/api/media-providers \
  src/app/api/v1/audio \
  src/app/api/v1/embeddings \
  src/app/api/v1/images \
  src/app/api/v1/search \
  src/app/api/v1/web \
  'src/app/api/v1/models/[kind]'
```

Xóa media handlers:

```bash
git rm \
  src/sse/handlers/embeddings.js \
  src/sse/handlers/imageGeneration.js \
  src/sse/handlers/tts.js \
  src/sse/handlers/stt.js \
  src/sse/handlers/search.js \
  src/sse/handlers/fetch.js
```

Xóa `open-sse` media implementation:

```bash
git rm -r \
  open-sse/handlers/embeddingProviders \
  open-sse/handlers/imageProviders \
  open-sse/handlers/ttsProviders \
  open-sse/handlers/search \
  open-sse/handlers/fetch

git rm \
  open-sse/handlers/embeddingsCore.js \
  open-sse/handlers/imageGenerationCore.js \
  open-sse/handlers/sttCore.js \
  open-sse/handlers/ttsCore.js
```

Sửa:

```text
src/app/api/v1/models/route.js
```

Build và commit:

```bash
npm run build
git add -A
git commit -m "remove media provider APIs and runtime handlers"
```

---

## 26. Commit 3: Cleanup tài liệu và config

Kiểm tra config không còn dùng:

```bash
git grep -nE \
  'mediaConfig|googleTtsLanguages|ttsModels'
```

Xóa file config nếu không còn import.

Tìm tài liệu liên quan:

```bash
git grep -niE \
  'media providers|dashboard/skills|9remote|embeddings|image generation|speech|transcription'
```

Chỉ xóa nội dung tài liệu liên quan tới tính năng đã bỏ.

Commit:

```bash
git add -A
git commit -m "clean up removed feature references"
```

---

# PHẦN F — KIỂM TRA CUỐI

## 27. Kiểm tra reference còn sót

```bash
git grep -nE \
  'MEDIA_PROVIDER_KINDS|dashboard/media-providers|dashboard/skills|NineRemote|9remote\.cc'
```

Kết quả mong muốn: không còn reference trong source.

Kiểm tra media handlers:

```bash
git grep -nE \
  'handlers/(embeddings|imageGeneration|tts|stt|search|fetch)'
```

Kiểm tra tunnel nếu đã xóa full remote access:

```bash
git grep -nE \
  '/api/tunnel|@/lib/tunnel|tailscale|cloudflared'
```

---

## 28. Chạy lint và build

Tùy scripts có trong `package.json`:

```bash
npm run lint
npm run build
```

Nếu không có script lint, chỉ cần:

```bash
npm run build
```

---

## 29. Test `/v1/models`

Chạy ứng dụng:

```bash
npm run dev
```

Gọi:

```bash
curl http://localhost:20127/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Kỳ vọng:

- Chỉ còn model chat/LLM.
- Không còn model image.
- Không còn TTS/STT.
- Không còn embedding.
- Không còn media kind endpoints.

---

## 30. Test chat non-streaming

```bash
curl http://localhost:20127/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "provider/model",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ],
    "stream": false
  }'
```

Kỳ vọng:

- HTTP 200.
- Có assistant response.
- Không lỗi import media handler.
- Account fallback vẫn hoạt động.

---

## 31. Test chat streaming

```bash
curl -N http://localhost:20127/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "provider/model",
    "messages": [
      {
        "role": "user",
        "content": "Count from 1 to 5"
      }
    ],
    "stream": true
  }'
```

Kỳ vọng:

- Nhận được SSE chunks.
- Có đúng một event kết thúc.
- Không có chunk sau `[DONE]`.
- Không retry sau khi đã gửi nội dung ra client.

---

## 32. Test các endpoint đã xóa

Các endpoint sau phải trả `404`:

```bash
curl -i http://localhost:20127/v1/embeddings
curl -i http://localhost:20127/v1/images/generations
curl -i http://localhost:20127/v1/audio/speech
curl -i http://localhost:20127/v1/audio/transcriptions
curl -i http://localhost:20127/v1/search
curl -i http://localhost:20127/v1/web/fetch
curl -i http://localhost:20127/v1/models/image
curl -i http://localhost:20127/v1/models/tts
curl -i http://localhost:20127/v1/models/stt
curl -i http://localhost:20127/v1/models/embedding
```

---

## 33. Test dashboard

Kiểm tra thủ công:

- Sidebar không còn **Media Providers**.
- Sidebar không còn **Skills**.
- Sidebar không còn **Remote/9Remote**.
- Header không hiển thị breadcrumb cũ.
- Truy cập trực tiếp page cũ trả `404`:
  - `/dashboard/media-providers/...`
  - `/dashboard/skills`
- Dashboard còn lại không có lỗi console.
- Provider chat vẫn cấu hình được.

---

# PHẦN G — ROLLBACK

## 34. Rollback theo commit

Xem lịch sử:

```bash
git log --oneline --decorate -10
```

Rollback commit cleanup:

```bash
git revert <commit-hash>
```

Không nên reset cứng nếu branch đã push và có người khác cùng làm việc.

---

## 35. Khôi phục từ baseline

Commit baseline được lưu trong:

```text
BASELINE_COMMIT
```

Xem diff so với baseline:

```bash
git diff "$(cat BASELINE_COMMIT)"..HEAD
```

Tạo branch kiểm tra baseline:

```bash
git checkout -b verify-baseline "$(cat BASELINE_COMMIT)"
```

---

# Checklist hoàn thành

## UI

- [ ] Xóa Media Providers khỏi Sidebar.
- [ ] Xóa Media Providers khỏi Header.
- [ ] Xóa Skills khỏi Sidebar.
- [ ] Xóa Skills khỏi Header.
- [ ] Xóa Remote/9Remote khỏi Sidebar.
- [ ] Xóa Remote modal.
- [ ] Xóa toàn bộ pages Media Providers.
- [ ] Xóa page Skills.

## Backend

- [ ] Xóa `/api/media-providers`.
- [ ] Xóa `/v1/embeddings`.
- [ ] Xóa `/v1/images`.
- [ ] Xóa `/v1/audio`.
- [ ] Xóa `/v1/search`.
- [ ] Xóa `/v1/web`.
- [ ] Xóa `/v1/models/[kind]`.
- [ ] Xóa `src/sse` media handlers.
- [ ] Xóa `open-sse` media cores.
- [ ] Xóa config media không còn dùng.

## Skills

- [ ] Xóa `src/shared/constants/skills.js`.
- [ ] Xóa thư mục `skills/`.
- [ ] Xóa references trong tài liệu.

## Remote

- [ ] Xóa `NineRemoteButton.js`.
- [ ] Xóa `NineRemotePromoModal.js`.
- [ ] Không còn reference `9remote.cc`.
- [ ] Tùy chọn: xóa Cloudflare Tunnel/Tailscale.

## Kiểm thử

- [ ] `npm run build` thành công.
- [ ] `/v1/models` chỉ còn model chat.
- [ ] Chat non-streaming hoạt động.
- [ ] Chat streaming hoạt động.
- [ ] Provider OAuth chat vẫn hoạt động.
- [ ] Account fallback vẫn hoạt động.
- [ ] Model fallback vẫn hoạt động.
- [ ] Endpoint media trả `404`.
- [ ] Dashboard không còn menu/page cũ.
- [ ] Không còn import hoặc route reference mồ côi.
