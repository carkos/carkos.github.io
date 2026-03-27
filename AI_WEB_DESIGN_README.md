# Vizzle AI 網頁設計說明

## 🎯 設計理念：預測未來2年LLM帶來的網頁使用習慣改變

### 主要趨勢預測

1. **從被動閱讀到主動對話**
   - 用戶不再願意花時間閱讀長篇網頁內容
   - 更傾向直接提問獲得即時答案
   - AI成為用戶與企業信息互動的主要入口

2. **即時答案取代信息搜索**
   - 傳統網頁需要用戶自行查找信息
   - AI時代用戶期望直接獲得精準答案
   - 減少信息密度，提升答案質量

3. **個性化交互體驗**
   - AI根據用戶問題動態生成回應
   - 每個用戶獲得量身定制的內容
   - 對話式交互成為主流

4. **知識驅動的智能服務**
   - 企業資料實時注入AI知識庫
   - AI能夠回答關於產品、服務、公司動向的各種問題
   - 員工可輕鬆更新AI知識

---

## 🏗️ 網頁架構

### 保留的核心元素

1. **橫向走馬燈** - 展示企業信任標誌
2. **公司簡介** - 統計數據和核心價值
3. **獎項與政府支持** - 權威認可展示

### 新增的AI核心功能

1. **AI對話界面** - 位於首屏Hero區域
2. **知識庫管理系統** - 員工後台管理入口
3. **常見問題快捷按鈕** - 引導用戶開始對話

---

## 🔌 LLM後端接入指南

### API端點設計

在前端代碼中，`processUserMessage` 函數是您需要修改的主要位置：

```javascript
// 當前位置：index.html 中的 processUserMessage 函數
async function processUserMessage(message) {
    conversationHistory.push({ role: 'user', content: message });
    addTypingIndicator();
    
    // ============================================
    // 在這裡接入您的LLM後端API
    // ============================================
    
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            conversationHistory: conversationHistory,
            knowledgeBase: knowledgeBase.content // 傳遞知識庫內容
        })
    });
    
    const data = await response.json();
    
    removeTypingIndicator();
    conversationHistory.push({ role: 'assistant', content: data.reply });
    
    return data.reply;
}
```

### 後端API規範

#### 請求格式
```json
{
    "message": "用戶的問題",
    "conversationHistory": [
        { "role": "user", "content": "之前的問題" },
        { "role": "assistant", "content": "之前的回答" }
    ],
    "knowledgeBase": [
        {
            "filename": "product_info.pdf",
            "text": "文件內容或提取的文本..."
        }
    ]
}
```

#### 響應格式
```json
{
    "reply": "AI的回答內容",
    "sources": ["可選：引用的知識庫來源"]
}
```

### 推薦的LLM集成方案

#### 方案1：OpenAI API + RAG
```javascript
// 使用OpenAI API + 向量數據庫
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
    const { message, knowledgeBase } = req.body;
    
    // 1. 使用向量搜索找到相關知識
    const relevantDocs = await vectorSearch(message, knowledgeBase);
    
    // 2. 構建prompt
    const systemPrompt = `你是Vizzle的AI助手。請根據以下知識庫內容回答問題：
    
${relevantDocs.join('\n\n')}

如果知識庫中沒有相關信息，請根據一般知識回答，但請說明這不是來自公司資料。`;

    // 3. 調用LLM
    const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ]
    });
    
    res.json({ reply: completion.choices[0].message.content });
});
```

#### 方案2：使用LangChain
```javascript
const { ChatOpenAI } = require('@langchain/openai');
const { RetrievalQAChain } = require('langchain/chains');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

// 創建向量存儲
async function createVectorStore(knowledgeBase) {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    });
    
    const docs = await textSplitter.createDocuments(
        knowledgeBase.map(k => k.text)
    );
    
    return await MemoryVectorStore.fromDocuments(
        docs,
        new OpenAIEmbeddings()
    );
}
```

---

## 📁 知識庫管理系統

### 設計理念

員工可以輕鬆上傳公司資料，AI會實時學習這些資料，當用戶提問時進行檢索並回答。

### 支持的文件格式

| 格式 | 擴展名 | 處理方式 |
|------|--------|----------|
| PDF | .pdf | 後端提取文本 |
| Excel | .xls, .xlsx | 後端解析數據 |
| HTML | .html, .htm | 前端提取文本 |
| Word | .doc, .docx | 後端提取文本 |
| 純文本 | .txt | 前端直接讀取 |
| JSON | .json | 前端直接讀取 |
| CSV | .csv | 前端直接讀取 |

### 知識庫數據結構

```javascript
knowledgeBase = {
    files: [
        {
            name: "產品手冊.pdf",
            type: "application/pdf",
            size: 1024000,
            uploadedAt: "2025-01-15T10:30:00Z"
        }
    ],
    content: [
        {
            filename: "產品手冊.pdf",
            text: "提取的文本內容..."
        }
    ],
    lastUpdate: "2025-01-15T10:30:00Z"
}
```

### 後端處理流程

```
1. 用戶上傳文件
      ↓
2. 前端讀取文件內容（文本文件）或發送至後端（PDF/Office）
      ↓
3. 後端提取文本內容
      ↓
4. 將文本分塊（chunking）
      ↓
5. 生成向量嵌入（embedding）
      ↓
6. 存儲到向量數據庫
      ↓
7. 用戶提問時進行語義搜索
      ↓
8. 返回相關內容給LLM生成答案
```

---

## 🚀 部署建議

### 文件夾結構建議

```
project/
├── index.html           # 前端網頁
├── assets/
│   └── img/            # 圖片資源
├── knowledge-base/     # 知識庫文件存儲（員工上傳的文件）
│   ├── products/
│   ├── company/
│   └── updates/
├── server/             # 後端服務
│   ├── index.js        # 主服務器
│   ├── routes/
│   │   └── chat.js     # 聊天API
│   ├── services/
│   │   ├── llm.js      # LLM服務
│   │   └── knowledge.js # 知識庫服務
│   └── utils/
│       └── parsers/    # 文件解析器
│           ├── pdf.js
│           ├── excel.js
│           └── word.js
└── vector-db/          # 向量數據庫（如Pinecone、Weaviate）
```

### 環境變量

```env
# .env
OPENAI_API_KEY=your_openai_api_key
VECTOR_DB_URL=your_vector_db_url
VECTOR_DB_API_KEY=your_vector_db_key
PORT=3000
```

---

## 📝 員工使用指南

### 如何更新AI知識庫

1. **訪問知識庫頁面**
   - 點擊導航欄的「知識庫」
   - 或滾動到頁面底部

2. **上傳文件**
   - 拖放文件到上傳區域
   - 或點擊「選擇文件」按鈕
   - 支持批量上傳

3. **管理文件**
   - 查看已上傳的文件列表
   - 點擊「移除」刪除不需要的文件
   - 「清空知識庫」重置所有內容

4. **驗證更新**
   - 返回首頁
   - 向AI提問相關問題
   - 確認AI能正確引用新資料

### 文件準備建議

- **PDF文檔**：確保文字可選取（非掃描圖片）
- **Excel表格**：添加清晰的標題行
- **HTML頁面**：移除導航欄等無關內容
- **文檔命名**：使用有意義的文件名，便於管理

---

## 🎨 網頁設計特點

### 保持原有風格

- ✅ Three.js 3D城市背景動畫
- ✅ Glass morphism 玻璃擬態卡片
- ✅ 紫色品牌主題色 (#6b3d92)
- ✅ 響應式設計（手機/平板/桌面）
- ✅ 多語言支持（繁/簡/英文）

### 優化的用戶體驗

- 🎯 AI對話位於首屏中心
- 💬 清晰的對話氣泡設計
- ⚡ 打字動畫提示AI思考中
- 📱 手機端完整的對話功能
- 🔄 對話歷史記錄保持

---

## 📞 聯繫支持

如有任何技術問題，請聯繫：
- 電話：+852 9660 5893
- 郵箱：info@im-vizzle.com

---

© 2026 Vizzle Limited 炫幻視界有限公司