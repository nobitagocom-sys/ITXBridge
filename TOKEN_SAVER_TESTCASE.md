# ITXBridge Token Saver — Test Case Toàn Diện

> **Mục tiêu:** Xác minh 4 tính năng tiết kiệm token của ITXBridge hoạt động thực sự.
> **Phương pháp:** Gửi cùng 1 request qua ITXBridge (bật/tắt từng tính năng), so sánh số token input/output trước và sau.

---

## Cấu hình Test

| Thành phần | Giá trị |
|---|---|
| ITXBridge endpoint | `http://localhost:20127` |
| Provider test | OpenAI (hoặc bất kỳ provider nào đã cấu hình) |
| Model test | `gpt-4o` hoặc model đang dùng |
| Công cụ đo | Request Inspector (ITXBridge UI) + `usageHistory` |
| Số lần chạy mỗi case | 1 lần (cùng input, khác config) |

---

## Chuẩn bị

```bash
# 1. Reset data cũ
sqlite3 /var/lib/itxbridge/db/data.sqlite "DELETE FROM requestDetails; DELETE FROM usageDaily; DELETE FROM usageHistory;"

# 2. Restart itxbridge
# (kill process cũ rồi chạy lại)
npm run dev

# 3. Vào Dashboard → Token Saver → đảm bảo TẤT CẢ 4 tính năng đang TẮT
#    - RTK (compress tool): OFF
#    - Headroom (compress context): OFF
#    - Caveman (compress output): OFF
#    - Ponytail (lazy senior dev): OFF
```

---

## Case 1: RTK — Compress Tool Output

### Mô tả
Khi LLM gọi tool (đọc file, git diff, grep, ls, find...) kết quả trả về thường rất lớn và chứa nhiều thông tin dư thừa. ITXBridge tự động nhận diện loại output và nén lại trước khi gửi lại cho LLM ở lượt tiếp theo.

### Cách test

**Bước 1:** Gửi request yêu cầu LLM đọc 1 file lớn (có đánh số dòng — dạng `read-numbered`):
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a coding assistant. Use the read_file tool to read files."
    },
    {
      "role": "user",
      "content": "Đọc file package.json và giải thích các dependency chính"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "read_file",
        "description": "Read a file",
        "parameters": {
          "type": "object",
          "properties": {
            "path": { "type": "string" }
          }
        }
      }
    }
  ]
}
```

**Bước 2:** Sau khi LLM gọi tool, client gửi tiếp request với tool result (mô phỏng file 200+ dòng có đánh số):
```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a coding assistant."},
    {"role": "user", "content": "Đọc file package.json và giải thích các dependency chính"},
    {"role": "assistant", "content": null, "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "read_file", "arguments": "{\"path\":\"package.json\"}"}}]},
    {
      "role": "tool",
      "tool_call_id": "call_1",
      "content": "     1|{\n     2|  \"name\": \"my-app\",\n     3|  \"version\": \"1.0.0\",\n     4|  \"dependencies\": {\n     5|    \"react\": \"^19.2.4\",\n     6|    \"react-dom\": \"^19.2.4\",\n     7|    \"next\": \"^16.1.6\",\n     8|    \"zustand\": \"^5.0.10\",\n     9|    \"bcryptjs\": \"^3.0.3\",\n    10|    \"jose\": \"^6.1.3\",\n    11|    \"express\": \"^5.2.1\",\n    12|    \"undici\": \"^7.19.2\",\n    13|    \"uuid\": \"^13.0.0\",\n    14|    \"sql.js\": \"^1.14.1\",\n    15|    \"selfsigned\": \"^5.5.0\",\n    16|    \"node-forge\": \"^1.3.3\",\n    17|    \"http-proxy-middleware\": \"^3.0.5\",\n    18|    \"socks-proxy-agent\": \"^8.0.5\",\n    19|    \"monaco-editor\": \"^0.55.1\",\n    20|    \"@monaco-editor/react\": \"^4.7.0\",\n    21|    \"recharts\": \"^3.7.0\",\n    22|    \"@xyflow/react\": \"^12.10.1\",\n    23|    \"@dnd-kit/core\": \"^6.3.1\",\n    24|    \"@dnd-kit/sortable\": \"^10.0.0\",\n    25|    \"@dnd-kit/modifiers\": \"^9.0.0\",\n    26|    \"@dnd-kit/utilities\": \"^3.2.2\",\n    27|    \"marked\": \"^18.0.1\",\n    28|    \"material-symbols\": \"^0.44.6\",\n    29|    \"open\": \"^11.0.0\",\n    30|    \"ora\": \"^9.1.0\",\n    31|    \"node-machine-id\": \"^1.1.12\",\n    32|    \"confbox\": \"^0.2.4\",\n    33|    \"@next/third-parties\": \"^16.2.9\"\n    34|  },\n    35|  \"devDependencies\": {\n    36|    \"@tailwindcss/postcss\": \"^4.1.18\",\n    37|    \"eslint\": \"^9\",\n    38|    \"eslint-config-next\": \"16.1.6\",\n    39|    \"postcss\": \"^8.5.6\",\n    40|    \"tailwindcss\": \"^4\"\n    41|  }\n    42|}\n"
    }
  ]
}
```

**Bước 3:** Gửi cùng request trên 2 lần:
- Lần A: **RTK OFF** — vào Token Saver tắt RTK
- Lần B: **RTK ON** — vào Token Saver bật RTK

### Chỉ số cần ghi nhận

| Chỉ số | RTK OFF | RTK ON | Tiết kiệm |
|---|---|---|---|
| Input tokens | ... | ... | ... |
| Output tokens | ... | ... | ... |
| Kích thước tool result (bytes) | ... | ... | ... |
| Tool result sau khi nén (bytes) | — | ... | ~X% |

### Các sub-case RTK nên test thêm

| Sub-case | Input mẫu | Filter được trigger | Mô tả |
|---|---|---|---|
| 1a. Git diff | Output `git diff` với 200+ dòng thay đổi | `gitDiff` | Hunks bị cắt >100 dòng, thống kê +/- |
| 1b. Git status | Output `git status` verbose | `gitStatus` | Rút gọn thành "N staged/modified/untracked" |
| 1c. Grep output | Output `grep -rn "pattern" .` | `grep` | Gom nhóm theo file, max 10 match/file |
| 1d. Find output | Output `find . -name "*.js"` | `find` | Gom theo thư mục, max 10 file/dir |
| 1e. ls output | Output `ls -la` | `ls` | Bỏ noise dirs, hiển thị `name size` |
| 1f. Tree output | Output `tree` | `tree` | Cắt còn 200 dòng |
| 1g. Build output | Output `npm run build` | `buildOutput` | Giữ lỗi + warning + summary, bỏ progress |
| 1h. Logs | Output log server 500+ dòng | `dedupLog` | Gộp dòng trùng, giới hạn 2000 dòng |
| 1i. File đọc lớn | File 300+ dòng (có đánh số) | `readNumbered` | Giữ 120 dòng đầu + 60 dòng cuối |
| 1j. Output ngắn | Tool output <500 bytes | (không nén) | Bỏ qua — dưới MIN_COMPRESS_SIZE |

### Kết quả mong đợi

- Tool output giảm đáng kể (thường 40-90% tùy loại)
- Input token ở lần request thứ 2 (có tool result) **thấp hơn** khi bật RTK
- LLM vẫn hiểu context và trả lời chính xác

---

## Case 2: Headroom — Compress Context

### Mô tả
Khi hội thoại dài, context window bị lấp đầy bởi các message cũ. Headroom proxy nén toàn bộ mảng messages, giữ lại ý chính và loại bỏ nội dung trùng lặp/không cần thiết.

### Cách test

**Bước 1:** Tạo 1 hội thoại dài (15-20 messages) với nội dung lặp lại:
```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful coding assistant."},
    {"role": "user", "content": "Viết function tính Fibonacci"},
    {"role": "assistant", "content": "```javascript\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n```"},
    {"role": "user", "content": "Thêm cache vào function trên"},
    {"role": "assistant", "content": "```javascript\nconst cache = new Map();\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache.has(n)) return cache.get(n);\n  const result = fibonacci(n - 1) + fibonacci(n - 2);\n  cache.set(n, result);\n  return result;\n}\n```"},
    {"role": "user", "content": "Đổi từ Map sang object"},
    {"role": "assistant", "content": "```javascript\nconst cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}\n```"},
    {"role": "user", "content": "Viết test cho function này"},
    {"role": "assistant", "content": "```javascript\nconsole.assert(fibonacci(0) === 0, 'fib(0)');\nconsole.assert(fibonacci(1) === 1, 'fib(1)');\nconsole.assert(fibonacci(10) === 55, 'fib(10)');\nconsole.assert(fibonacci(20) === 6765, 'fib(20)');\nconsole.log('All tests passed');\n```"},
    {"role": "user", "content": "Giải thích độ phức tạp"},
    {"role": "assistant", "content": "Độ phức tạp thời gian: O(n) với memoization (mỗi số tính 1 lần). Không gian: O(n) cho cache + O(n) cho call stack."},
    {"role": "user", "content": "Có cách nào tối ưu không gian hơn không?"},
    {"role": "assistant", "content": "Có thể dùng iterative bottom-up: chỉ cần 2 biến. Không gian O(1).\n```javascript\nfunction fib(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}\n```"},
    {"role": "user", "content": "Viết lại toàn bộ code từ đầu đến giờ thành 1 file hoàn chỉnh"},
    {"role": "assistant", "content": "```javascript\n// fibonacci.js - Complete implementation with tests\n\n// Version 1: Recursive with memoization (object cache)\nconst cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}\n\n// Version 2: Iterative (O(1) space)\nfunction fibonacciIterative(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}\n\n// Tests\nconsole.assert(fibonacci(0) === 0, 'fib(0)');\nconsole.assert(fibonacci(1) === 1, 'fib(1)');\nconsole.assert(fibonacci(10) === 55, 'fib(10)');\nconsole.assert(fibonacci(20) === 6765, 'fib(20)');\nconsole.assert(fibonacciIterative(30) === 832040, 'fibIter(30)');\nconsole.log('All tests passed');\n```"},
    {"role": "user", "content": "Giờ hãy giúp tôi implement binary search"}
  ]
}
```

**Bước 2:** Gửi request trên 2 lần:
- Lần A: **Headroom OFF** — tắt headroom
- Lần B: **Headroom ON** — bật headroom, đảm bảo proxy đang chạy

### Chỉ số cần ghi nhận

| Chỉ số | Headroom OFF | Headroom ON | Tiết kiệm |
|---|---|---|---|
| Input tokens | ... | ... | ... |
| Số messages gốc | 11 | 11 | — |
| Kích thước body gốc (bytes) | ... | ... | — |
| Kích thước body sau nén (bytes) | — | ... | ~X% |
| Output tokens | ... | ... | ... |
| Chất lượng câu trả lời | ... | ... | ... |

### Kết quả mong đợi

- Input tokens giảm đáng kể (25-60% tùy độ dài và độ lặp)
- LLM vẫn trả lời đúng context (biết đang nói về Fibonacci và binary search)
- Nếu `headroomCompressUserMessages` = false, user messages được giữ nguyên

---

## Case 3: Caveman — Compress LLM Output

### Mô tả
Inject system prompt khiến LLM trả lời cực kỳ ngắn gọn (kiểu caveman), giảm output tokens ~65-87%.

### Các sub-case (6 level)

| Level | Mô tả | Prompt Inject |
|---|---|---|
| 3a. **Lite** | Ngắn gọn, giữ câu đầy đủ | "Respond tersely. Keep grammar and full sentences but drop filler..." |
| 3b. **Full** | Caveman thực thụ | "Respond like terse caveman. All technical substance stay exact, only fluff die. Drop articles..." |
| 3c. **Ultra** | Nén tối đa | "Respond ultra-terse. Maximum compression. Telegraphic. Abbreviate..." |

### Cách test

Gửi cùng 1 prompt "mở" (dễ sinh câu trả lời dài) qua 4 lần:

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Explain how HTTPS works. Include the TLS handshake, certificate validation, and symmetric vs asymmetric encryption."}
  ]
}
```

| Lần | Caveman | Ponytail | Khác |
|---|---|---|---|
| A | OFF | OFF | Baseline |
| B | Lite | OFF | — |
| C | Full | OFF | — |
| D | Ultra | OFF | — |

### Chỉ số cần ghi nhận

| Chỉ số | OFF (A) | Lite (B) | Full (C) | Ultra (D) |
|---|---|---|---|---|
| Output tokens | ... | ... | ... | ... |
| Input tokens | ... | ... | ... | ... |
| Số ký tự câu trả lời | ... | ... | ... | ... |
| Tiết kiệm vs baseline | — | ~X% | ~X% | ~X% |
| Vẫn đúng kỹ thuật? | ✓ | ✓/✗ | ✓/✗ | ✓/✗ |
| Có bỏ sót thông tin quan trọng? | — | ✓/✗ | ✓/✗ | ✓/✗ |

### Prompt test bổ sung

Test với các loại câu hỏi khác nhau để đánh giá chất lượng:

| Loại | Prompt |
|---|---|
| Code | "Viết function xác thực email regex, giải thích từng phần" |
| Kiến thức | "So sánh PostgreSQL vs MongoDB: khi nào dùng cái nào" |
| Hướng dẫn | "Hướng dẫn deploy Next.js app lên VPS các bước" |
| Bảo mật | "Tôi có nên lưu password dạng hash không? Tại sao?" |
| Bug | "Code tôi bị memory leak, làm sao debug?" |

### Kết quả mong đợi

- Output tokens giảm rõ rệt ở mỗi level
- Level Ultra có thể quá cực đoan với các câu hỏi cần giải thích
- SHARED_BOUNDARIES vẫn hoạt động: security warnings, code blocks giữ nguyên

---

## Case 4: Ponytail — Lazy Senior Dev

### Mô tả
Inject system prompt "lazy senior developer" khiến LLM viết code tối giản, YAGNI, stdlib-first, không over-engineering.

### Các sub-case (3 level)

| Level | Mô tả |
|---|---|
| 4a. **Lite** | Code như yêu cầu, gợi ý thêm hướng đơn giản hơn |
| 4b. **Full** | Thực thi decision ladder nghiêm ngặt |
| 4c. **Ultra** | YAGNI extremist, xóa trước thêm sau |

### Cách test

Gửi cùng prompt yêu cầu code 5 lần:

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Viết một REST API client trong JavaScript để gọi API https://jsonplaceholder.typicode.com/posts. Cần có: class với constructor, method GET all posts, GET post by ID, POST tạo mới, PUT update, DELETE, error handling, retry logic, logging, và type definitions."}
  ]
}
```

| Lần | Caveman | Ponytail | Mô tả |
|---|---|---|---|
| A | OFF | OFF | Baseline |
| B | OFF | Lite | Gợi ý hướng đơn giản hơn |
| C | OFF | Full | Thực thi decision ladder |
| D | OFF | Ultra | YAGNI extremist |
| E | Full | Ultra | Caveman + Ponytail cùng lúc |

### Chỉ số cần ghi nhận

| Chỉ số | OFF (A) | Lite (B) | Full (C) | Ultra (D) | Caveman+Ultra (E) |
|---|---|---|---|---|---|
| Output tokens | ... | ... | ... | ... | ... |
| Số dòng code | ... | ... | ... | ... | ... |
| Số file/class tạo ra | ... | ... | ... | ... | ... |
| Có dùng thư viện ngoài? | ... | ... | ... | ... | ... |
| Có factory/interface thừa? | ... | ... | ... | ... | ... |
| Tiết kiệm vs baseline | — | ~X% | ~X% | ~X% | ~X% |
| Code vẫn hoạt động? | ✓ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ |

### Prompt test bổ sung

| Loại | Prompt |
|---|---|
| CRUD | "Tạo REST API cho model User với Express: CRUD + validation + pagination" |
| Tool | "Viết CLI tool parse CSV và xuất JSON, có flag --input, --output, --pretty" |
| Component | "Tạo React component DataTable: sortable columns, pagination, search filter" |
| Utility | "Viết function deepClone trong JS, xử lý circular references" |

### Kết quả mong đợi

- Code output ngắn hơn, ít boilerplate hơn
- Không có interface 1 implementation, không factory thừa
- `fetch()` native thay vì cài axios
- Có comment `ponytail:` đánh dấu

---

## Case 5: Kết Hợp Nhiều Tính Năng

### Mô tả
Test khả năng kết hợp các tính năng với nhau trong 1 request thực tế.

### Scenario: Hội thoại dài với tool calls

Mô phỏng workflow thực tế:
1. User hỏi về bug trong codebase
2. LLM gọi `grep` tool tìm kiếm → output lớn → **RTK nén**
3. LLM gọi `read_file` tool đọc file → output có đánh số dòng → **RTK nén**
4. Hội thoại dài 10+ messages → **Headroom nén context**
5. LLM trả lời → **Caveman + Ponytail** nén output

### Bảng test

| ID | RTK | Headroom | Caveman | Ponytail | Input Tokens | Output Tokens | Ghi chú |
|---|---|---|---|---|---|---|---|
| 5a | OFF | OFF | OFF | OFF | ... | ... | Baseline |
| 5b | ON | OFF | OFF | OFF | ... | ... | Chỉ RTK |
| 5c | ON | ON | OFF | OFF | ... | ... | RTK + Headroom |
| 5d | ON | ON | Full | OFF | ... | ... | + Caveman |
| 5e | ON | ON | Full | Full | ... | ... | Full stack |
| 5f | ON | ON | Ultra | Ultra | ... | ... | Max save |

### Kết quả mong đợi

```
Baseline (5a):   ████████████████████████████████ 100%
RTK only (5b):   ██████████████████████████ ~70%
+Headroom (5c):  ████████████████ ~45%
+Caveman (5d):   ██████████ ~25%
+Ponytail (5e):  ██████ ~15%
Max save (5f):   ████ ~10%
```

---

## Phụ Lục A: Cách Đo Lường

### A1. Qua Request Inspector UI
1. Vào Dashboard → Request Inspector
2. Tìm request vừa gửi
3. Xem cột **Tokens in/out** trong bảng
4. Click **Inspect** → xem chi tiết input/output, diff messages

### A2. Qua SQLite trực tiếp
```bash
# Xem tất cả records
sqlite3 /var/lib/itxbridge/db/data.sqlite "
SELECT 
  datetime(timestamp) as time,
  model,
  status,
  json_extract(data, '$.tokens.prompt_tokens') as input_tokens,
  json_extract(data, '$.tokens.completion_tokens') as output_tokens,
  json_extract(data, '$.latency.total') as latency_ms
FROM requestDetails 
ORDER BY timestamp DESC 
LIMIT 20;
"

# Tính tổng token đã dùng
sqlite3 /var/lib/itxbridge/db/data.sqlite "
SELECT 
  SUM(json_extract(data, '$.tokens.prompt_tokens')) as total_input,
  SUM(json_extract(data, '$.tokens.completion_tokens')) as total_output,
  SUM(json_extract(data, '$.tokens.prompt_tokens') + json_extract(data, '$.tokens.completion_tokens')) as total_all
FROM requestDetails;
"
```

### A3. So sánh body trước/sau

```bash
# Xem request gốc và providerRequest đã transform
sqlite3 /var/lib/itxbridge/db/data.sqlite "
SELECT 
  json_extract(data, '$.request') as original_request,
  json_extract(data, '$.providerRequest') as transformed_request
FROM requestDetails 
ORDER BY timestamp DESC 
LIMIT 1;
" | python3 -m json.tool
```

---

## Phụ Lục B: Kết Quả Thực Tế

> **Ghi chú:** Điền kết quả sau khi chạy test. Mỗi dòng là 1 lần chạy.

### B1. RTK Results

| Sub-case | Input gốc (bytes) | Input sau nén (bytes) | Giảm | Input tokens OFF | Input tokens ON | Token tiết kiệm |
|---|---|---|---|---|---|---|
| 1a. Git diff | | | | | | |
| 1b. Git status | | | | | | |
| 1c. Grep | | | | | | |
| 1d. Find | | | | | | |
| 1e. ls | | | | | | |
| 1f. Tree | | | | | | |
| 1g. Build output | | | | | | |
| 1h. Logs | | | | | | |
| 1i. File lớn | | | | | | |
| 1j. Output ngắn | | | | | | |

### B2. Headroom Results

| Độ dài hội thoại | Input tokens OFF | Input tokens ON | Tiết kiệm | Chất lượng |
|---|---|---|---|---|
| 5 messages | | | | |
| 10 messages | | | | |
| 15 messages | | | | |
| 20 messages | | | | |

### B3. Caveman Results

| Prompt loại | Output OFF | Output Lite | Output Full | Output Ultra |
|---|---|---|---|---|
| Giải thích kỹ thuật | | | | |
| Viết code | | | | |
| So sánh | | | | |
| Hướng dẫn | | | | |
| Bảo mật | | | | |
| Debug | | | | |

### B4. Ponytail Results

| Prompt loại | Output OFF | Output Lite | Output Full | Output Ultra |
|---|---|---|---|---|
| REST API client | | | | |
| CRUD Express | | | | |
| CLI tool | | | | |
| React component | | | | |

### B5. Combined Results

| ID | Input Tokens | Output Tokens | Total | % Baseline |
|---|---|---|---|---|
| 5a (baseline) | | | | 100% |
| 5b (RTK) | | | | |
| 5c (+Headroom) | | | | |
| 5d (+Caveman) | | | | |
| 5e (+Ponytail) | | | | |
| 5f (Max) | | | | |

---

## Phụ Lục C: Các Flag Quan Trọng Trong Code

| Flag | File | Mặc định | Ý nghĩa |
|---|---|---|---|
| `rtkEnabled` | settingsRepo.js:37 | `true` | Bật/tắt toàn bộ RTK compress |
| `headroomEnabled` | settingsRepo.js:38 | `false` | Bật/tắt headroom proxy |
| `headroomCompressUserMessages` | settingsRepo.js:40 | `false` | Headroom có nén user messages không |
| `cavemanEnabled` | settingsRepo.js:41 | `false` | Bật/tắt caveman |
| `cavemanLevel` | settingsRepo.js:42 | `"full"` | `lite` / `full` / `ultra` |
| `ponytailEnabled` | settingsRepo.js:43 | `false` | Bật/tắt ponytail |
| `ponytailLevel` | settingsRepo.js:44 | `"full"` | `lite` / `full` / `ultra` |
| `MIN_COMPRESS_SIZE` | rtk/constants.js | `500` (bytes) | Tool output dưới size này bỏ qua |
| `RAW_CAP` | rtk/constants.js | `10MiB` | Tool output trên size này bỏ qua |
| `OBSERVABILITY_ENABLED` | env | `true` | Bật/tắt ghi request details |

---

## Phụ Lục D: Kiểm Tra Nhanh Bằng Mắt

Sau mỗi test case, vào Request Inspector kiểm tra:

1. **Tab "Message Diff"** — Xem messages user gửi vs messages gửi tới LLM có khác nhau không
   - Nếu RTK ON: tool result trong LLM payload phải ngắn hơn user input
   - Nếu Headroom ON: toàn bộ messages phải ít hơn/ngắn hơn

2. **Tab "Changes"** — Xem các thay đổi structural
   - Caveman injected: hiện "Caveman RTK injected"
   - Ponytail injected: hiện "Ponytail RTK injected"
   - Model rewritten: model bị thay đổi bởi itxbridge

3. **Tab "User Input (raw)"** / **"LLM Payload (raw)"** — So sánh raw JSON
   - System prompt có thêm caveman/ponytail text không
   - Tool results có bị rút gọn không

---

> **Ngày tạo:** 2026-06-29
> **Phiên bản ITXBridge:** 0.5.12
