# bat-combat Specification

## Purpose

定義玩家以空白鍵、滑鼠左鍵或觸控點按觸發左手鐵棍揮擊的操作契約，讓命中取決於可辨認的距離與時機，並用一次性判定及清楚的擊碎回饋維持規則公平與重擊爽感。

## Requirements

### Requirement: Discrete spacebar swing
系統 SHALL 僅在遊戲進行中且上一揮擊已完成時，接受一次新的空白鍵按下，播放左手離開手把、揮動鐵棍及回位。按住不連發；揮棒期間的新按鍵不排隊，遊戲中的空白鍵不造成頁面捲動。

#### Scenario: Hold and release
- **WHEN** 玩家持續按住空白鍵直到揮棒完成
- **THEN** 只揮擊一次，必須放開後重新按下才能再揮擊

#### Scenario: Press during recovery
- **WHEN** 玩家在揮棒尚未完成時再次按下空白鍵
- **THEN** 不開始或排入另一揮擊，現有動畫完成後左手回到手把

### Requirement: Distance-based hit window
系統 SHALL 讓接近的車輛在固定近距離範圍內可被命中約0.5秒。接受攻擊輸入時，若最近的未擊中車在此範圍內 SHALL 鎖定該車，不因預備動作期間離開範圍而揮空；提早揮擊則須有效階段與範圍重疊。命中仍以實際接觸時刻計分，30秒後不命中，尾段不縮短窗口。

#### Scenario: Successful timing
- **WHEN** 鐵棍進入有效揮擊階段且一輛車位於命中範圍
- **THEN** 該車可被命中並依燈型及命中時間計分

#### Scenario: Out-of-range swing
- **WHEN** 整段有效揮擊期間車輛都尚未到達或已通過命中範圍
- **THEN** 揮擊不命中且分數不變

### Requirement: One target and one score event
系統 SHALL 每次揮擊最多命中一輛尚未被擊中的車；多車符合時選擇最近的一輛，不以燈型挑選。每車每局最多觸發一次命中與計分，汽車的兩盞燈不分別計分。

#### Scenario: Multiple eligible vehicles
- **WHEN** 同一揮擊時有兩輛未被擊中的車在範圍內
- **THEN** 只命中最近的車，即使它是一般大燈車

#### Scenario: Repeated contact
- **WHEN** 已命中的車仍在畫面中且與鐵棍再次重疊
- **THEN** 不再次計分或播放另一組命中效果

### Requirement: Heavy smash feedback
系統 SHALL 在命中時立即熄滅目標燈光並移除其遠光燈過曝貢獻，呈現像素玻璃碎片、短促震動、撞擊音與鐵棍回彈，命中姿勢停頓約80毫秒。誤擊 SHALL 有可辨識的扣分提示；揮空不播放擊碎效果。

#### Scenario: High beam relief
- **WHEN** 玩家擊中遠光燈車
- **THEN** 該車燈光及其過曝立即消失，重擊效果與正分提示出現，其他遠光燈車仍能造成過曝

#### Scenario: Ordinary headlight mistake
- **WHEN** 玩家擊中一般大燈車
- **THEN** 該車燈光熄滅並出現擊碎效果與明確扣分提示

#### Scenario: Silent audio fallback
- **WHEN** 瀏覽器無法啟用音訊
- **THEN** 遊戲仍可操作、正常計分並呈現其他命中回饋

### Requirement: Spoken hit reactions
系統 SHALL 在現有重擊音效之外，於命中遠光燈時播放一般合成聲線的「Motherfucker!」，誤擊一般大燈時播放「Sorry.」。連續命中時播放最新反應，靜音及重新開始 SHALL 停止上一段語音；語音不可用時仍保留其他可用音效與遊戲操作。

#### Scenario: Correct and incorrect light reactions
- **WHEN** 玩家命中遠光燈或一般大燈
- **THEN** 分別播放「Motherfucker!」或「Sorry.」，與原本的打擊音效並行

#### Scenario: Speech does not queue across hits or rounds
- **WHEN** 上一段語音未結束就再次命中、靜音或重新開始
- **THEN** 停止上一段語音；再次命中時只播放最新反應，靜音或重開時不殘留舊語音
### Requirement: Pointer swing input
系統 SHALL 在局中接受滑鼠左鍵或主要觸控點按來觸發揮棒，並提供至少44像素高的揮棒按鈕。所有輸入共用相同恢復時間，不排隊、不長按連發；右鍵、次要觸控及開始／重玩／音量等介面操作不觸發攻擊。

#### Scenario: Tap or left click to attack
- **WHEN** 玩家在局中左鍵點擊或單指點按畫面或揮棒按鈕
- **THEN** 與空白鍵相同地觸發一次揮棒，保持同一命中與計分規則

#### Scenario: Ignore alternate presses and controls
- **WHEN** 玩家按右鍵、使用次要觸控、長按或操作開始／重玩／音量按鈕
- **THEN** 不產生額外揮擊；恢復期間的攻擊不排隊
### Requirement: Attack readiness agrees with the red cue
系統 SHALL 僅在可接受新揮擊、且能於30秒之前完成接觸時顯示可攻擊提示；揮棒恢復期間不顯示紅框，揮棒按鈕顯示回位狀態且不可使用。

#### Scenario: Late red-frame press remains a hit
- **WHEN** 玩家在紅框仍亮、距離窗口結束只剩10毫秒時按下攻擊
- **THEN** 鎖定當下最近的合格車輛，80毫秒預備後仍正常命中並僅計分一次

#### Scenario: Recovery is visibly unavailable
- **WHEN** 另一輛車在上一揮擊回位期間進入距離範圍
- **THEN** 不亮可攻擊紅框且按鈕顯示回位中，恢復後才依當下車輛距離重新顯示提示