# 遠光燈粉碎者 / High Beam Smasher

支援桌面與手機瀏覽器的第一人稱像素紓壓遊戲。每局30秒，看準遠光燈，以空白鍵、滑鼠左鍵或手指點按揮動左手鐵棍。

## 本機啟動

需要 Node.js 20.19+ 或22.12+（本次使用24），以及 npm。

```sh
npm ci
npm run dev
```

開啟終端機顯示的本機網址。正式產物以 `npm run build` 產生，`npm run preview` 可預覽；部署時提供 dist/ 的靜態內容即可。

手機試玩：電腦執行 `npm run dev:lan`，手機與電腦連同一個區域網路，再開啟終端機顯示的 Network 網址。手機上的 localhost／127.0.0.1 代表手機本身，請改用電腦的區域網路網址。直向與橫向皆可遊玩；局中點按畫面或「點按揮棒」按鈕即可出手，其他介面按鈕不觸發攻擊，多指與長按不連發。

## 驗證

```sh
npm test
npm run typecheck
npm run build
```

瀏覽器整合驗收使用正式建置：

```sh
npm run build
npm run test:browser
```

Windows 預設使用已安裝的 Microsoft Edge；其他系統使用 Playwright Chromium（首次執行可先 `npx playwright install chromium`）。可用 `BROWSER_CHANNEL` 指定已安裝的其他 Chromium 通道。驗收會啟動本機4173埠、生成截圖與 JSON 結果，並在結束後關閉測試瀏覽器和預覽服務。執行時約需45秒，其中一局使用真實30秒時鐘。詳細結果見 docs/acceptance.md。

## 規則

- 每局遠光燈汽車10輛、遠光燈機車10輛，另有一般大燈汽車5輛、機車5輛，共30輛，順序與有限範圍內的間隔隨機。
- 遠光燈命中 +1，一般大燈誤擊 -1；最後五秒依命中時刻改為 +2 / -2。允許負分。
- 揮空與漏打不扣分。一次揮擊只擊中最近的一輛，每車只計分一次，汽車兩盞燈也只算一次。
- 按住不連發，揮棒尚未完成的輸入不排隊。車輛抵達近距離提示範圍時揮擊。
- 倒數不因重擊或切換分頁而暫停，歸零立即結算；可重新開始。

## 程式分層

- src/game/：獨立於瀏覽器的排程、時間與揮擊規則。
- src/render/：像素世界、透視、騎士與打擊效果。
- src/audio/：使用者操作後啟用的本機合成音訊。
- src/main.ts：頁面介面、鍵盤及遊戲迴圈連接。

無後端、帳號或外部美術／音訊下載。音訊由開始按鈕解鎖；若瀏覽器限制音訊，遊戲仍可正常操作與計分。

命中遠光燈時追加「Motherfucker!」，誤擊一般大燈時追加「Sorry.」語音，保留原有打擊音效。使用一般系統合成聲線 Microsoft David Desktop，並非 Samuel L. Jackson 的錄音或仿聲。語音 WAV 隨遊戲打包，不依賴瀏覽器語音服務；連續命中播放最新反應，靜音或重開會停止上一段。可在有此系統聲線的 Windows 執行 `powershell -File scripts/generate-voice.ps1` 重建。

遠光燈語音加上強重音、短斷句、較低音高與輕度飽和失真，營造更兇的遊戲反應；「Sorry」維持原本語氣。
