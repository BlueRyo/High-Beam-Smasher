# 第一版驗收紀錄

OpenSpec 已同步三份主規格並封存於 `openspec/changes/archive/2026-10-25-add-high-beam-smash-game/`，17項任務全部完成。

日期：2026-10-25（Asia/Taipei）。變更：add-high-beam-smash-game。

## 執行環境與結果

- Windows / Node.js 24.11.1。
- TypeScript 5.9.3、Vite 7.3.7、Vitest 3.2.7、Playwright 1.64.1，完整版本由 package-lock.json 鎖定。
- 桌面 Microsoft Edge 156.0.4314.42，測試的是 `dist/` 正式建置產物。
- `npm test`：24個測試通過，包含200組隨機排程的配額、間距、完整命中窗口與尾段加密驗證。
- `npm run typecheck`、`npm run build`：通過。
- `npm run test:browser`：16項整合檢查通過，未出現頁面例外或 console error；機器可讀結果見 [browser-results.json](browser-results.json)。

## 規則與完整流程

透過真實鍵盤事件，逐一命中一局中的30輛車；每次立即比較頁面分數與預期普通／雙倍計分，最後確認結算為20輛遠光燈及10次一般大燈誤擊，沒有額外出車或重複計分。包含第一次誤擊變負分、正確命中、揮空及未操作整局保持0分。

可控時間檢查刻意跳過動畫幀，驗證接觸時刻在25秒前仍以普通分數結算，跨過30秒則立即結束。規則測試另覆蓋29.98秒的有效重擊、30秒的無效接觸、最近目標優先、同車雙燈只計一次，以及停頓不改變車流與局長。

重新開始驗證分數、倒數、命中統計、字色與提示清除；長按空白鍵及重複 keydown 不會自動連發，空白鍵不會捲動頁面。失焦／visibilitychange 處理以事件派送測試，背景長時間未更新以時間跳躍測試，並由獨立的未安裝測試時鐘的瀏覽器環境驗證真實30秒局次。實際耗時存於 JSON（包含瀏覽器操作及斷言輪詢開銷）。

## 畫面與重擊檢視

檢視1440與1024寬度截圖：夜間道路持續前進、汽機車由遠放大、不同距離車輛重疊可見、手把／儀表板與右手保留，左手揮棒後回位。局中縮放維持16:9顯示及480×270邏輯座標，後續命中結果不受影響。

一般大燈為局部暖黃光；遠光燈為白色十字光暈，接近時提高整體曝光。擊中後該車燈光立即消失，遠處其他遠光燈仍能照亮場景。多車過曝上限0.56，倒數、分數與紅色近距離提示可讀。

試玩修正：騎士改為沿分隔線右側行進，路緣、道路底色與反光柱配合調整，對向車輛仍在左側。有效命中窗口改為完整紅框與 SPACE! 標籤，繪於過曝上方，進入範圍才亮、離開或命中立即消失；兩種燈型均顯示，避免將紅框誤當成燈型判斷。已重新執行規則測試、建置與瀏覽器驗收並更新截圖。

命中畫面呈現鐵棍約80毫秒停頓、星狀撞擊閃光、24片像素碎片、短震動與回彈；誤擊以不同文字及顏色顯示。首次畫面檢視後降低掃描線強度，移除與 HUD 重疊文字；參數已同步 design.md。

| 狀態 | 截圖 |
| --- | --- |
| 開始畫面 | [ready.png](screenshots/ready.png) |
| 一般大燈接近 | [normal-light.png](screenshots/normal-light.png) |
| 遠光燈過曝 | [glare.png](screenshots/glare.png) |
| 正確重擊 | [smash.png](screenshots/smash.png) |
| 一般大燈誤擊 | [wrong-light.png](screenshots/wrong-light.png) |
| 最後五秒 | [final-five.png](screenshots/final-five.png) |
| 1024寬度 | [desktop-1024.png](screenshots/desktop-1024.png) |
| 結算 | [results.png](screenshots/results.png) |

## 音訊驗證

正常瀏覽器中，開始操作後 AudioContext 進入 running，揮棒、重擊低音、碎玻璃及尾段提示實際建立音源。另在 AudioContext 建構必定失敗的環境完成命中、計分、靜音按鈕切換與結算，確認無音訊時仍可遊玩。這是合成音效的功能驗證；音色與重擊爽感可在試玩後繼續微調。

追加語音驗證：兩段一般合成聲線 WAV 已隨正式產物載入與解碼；完整局次中30次命中皆建立語音音源，兩種反應均有播放，密集命中會停止過時語音。命中遠光燈播放「Motherfucker!」，一般大燈播放「Sorry.」，並保留原本打擊音效。語音為 Microsoft David Desktop 合成，不是演員錄音或仿聲。

## 重跑

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser
```

測試服務使用本機4173埠，結束後自動關閉；截圖與 JSON 會更新。以 `npm run dev` 啟動互動試玩。第一版支援桌面與手機的鍵盤、滑鼠左鍵及觸控操作，所有美術及音效由程式本機產生，無外部服務與遠端部署需求。

## 手機與語氣調整驗收

手機操作驗證：以390×844、844×390的 Chromium 手機模擬環境（啟用真實觸控事件）驗證畫面無橫向溢位，輪流點按畫面及揮棒按鈕完成全部30次命中，逐筆確認分數、最後結算20輛遠光燈與10輛一般大燈，並確認重新開始歸零。實際手機 Safari／Chrome 的音色及觸控手感仍可由裝置試玩確認；此次未使用實體手機。

桌面滑鼠驗證：右鍵不揮擊，左鍵按下可命中，持續按住三秒不產生額外攻擊。輸入與鍵盤共用恢復時間及判定，按開始不附帶揮擊。

語氣調整：遠光燈語音加重兩段重音及65毫秒斷句、降低音高並增加輕度粗糙感；一般大燈語音維持原樣。兩段語音持續在完整局次中正確載入與播放。

截圖：[手機開始](screenshots/mobile-ready.png)、[手機遊戲](screenshots/mobile-playing.png)、[手機橫向](screenshots/mobile-landscape.png)。
## 紅框與命中一致性修正

失敗重現指令：`npm test -- -t "red frame is visible"`。修正前，在同一輛車的2.95與2.99秒輸入時，hittable為真、攻擊被接受，但分數仍為0；原因是80毫秒預備動作使接觸落於3.0秒距離窗口之後，與渲染紅框的條件不一致。此同步規則測試不需要渲染即可重現，排除單純畫面掉幀才發生的解釋。

修正為輸入時鎖定範圍內最近的車，預備後仍可命中，保持實際接觸時刻計分與30秒截止。恢復期間紅框不顯示，按鈕不可用且顯示「揮棒回位中…」。補上窗口起點、中段、最後100／50／10毫秒、最近一般大燈誤擊及跨25秒倍率、回位狀態等回歸測試。

瀏覽器另在手機模擬中於第一輛車窗口結束前20毫秒確認畫布確實存在紅框像素，再以真實觸控事件點擊，等待預備後確認得分／扣分、紅框消失、回位按鈕停用及恢復。截圖：[末段紅框](screenshots/late-red-frame.png)、[末段命中](screenshots/late-red-hit.png)。

## GitHub Pages 部署準備

新增 master 推送觸發的官方 GitHub Actions 工作流程，使用 Node.js 24、npm ci、規則測試、型別檢查與 Vite 建置，將 dist/ 上傳並部署。Vite 相對 base 已通過 `npm run test:pages`：在 `/High-Beam-Smasher/` 下確認 JS、CSS、圖示、兩段語音、手機紅框末段命中及首頁導覽均正常，無404或頁面例外。24個規則測試及正式建置重新通過。儲存庫已改為公開並啟用 Pages，GitHub Actions 建置與部署均成功。公開網址 https://blueryo.github.io/High-Beam-Smasher/ 已以未登入的測試瀏覽器確認 HTTP 200、手機版型、JS／CSS、兩段語音、紅框末段觸控命中、結算與重玩，無資產載入失敗或頁面例外。
