# Spec Delta

## Purpose

定義短局紓壓遊戲的開始、進行、結束與重新開始流程，確保隨機車流仍保有固定數量、可完成的接近時間，以及一致可驗證的普通時段與尾段計分規則。

## ADDED Requirements

### Requirement: Thirty-second session lifecycle
系統 SHALL 提供開始、進行中與結算狀態；每局從玩家開始操作起計時30秒，初始分數為0，時間歸零後停止接受揮擊與計分，並顯示最終分數與重新開始入口。

#### Scenario: Start and finish a round
- **WHEN** 玩家啟動一局並經過30秒
- **THEN** 倒數從30降至0並進入結算，此後空白鍵不再改變分數

#### Scenario: Replay resets the round
- **WHEN** 玩家在結算後重新開始
- **THEN** 分數歸零、倒數回到30秒，先前車輛、揮棒及效果不會帶入新局

### Requirement: Fixed vehicle quotas with randomized arrivals
系統 SHALL 每局安排恰好30輛對向車：遠光燈汽車10輛、遠光燈機車10輛、一般大燈汽機車合計10輛。一般大燈車須包含兩種車型；出場後燈型固定。系統 SHALL 隨機化順序及受限制的出場間隔，確保每輛車都能在結束前獲得完整命中窗口。

#### Scenario: Full round contains the agreed mix
- **WHEN** 一局完整進行至結束
- **THEN** 累計出場遠光燈汽車10輛、遠光燈機車10輛、一般大燈車10輛，且一般大燈中包含汽車與機車

#### Scenario: Randomization preserves opportunity
- **WHEN** 產生不同隨機局次
- **THEN** 順序或間隔可以不同，但固定配額、接近過程與結束前完整命中窗口均保持成立

### Requirement: Accelerated final phase
系統 SHALL 在已過25秒、剩餘5秒時進入尾段，明確提示雙倍計分並縮短出車間隔；尾段仍計入原本30輛配額，保留既有接近時間、命中窗口與揮棒節奏。

#### Scenario: Enter the final five seconds
- **WHEN** 遊戲時間到達25秒
- **THEN** 尾段提示啟用，尾段出車間隔短於普通時段，且不額外生成第31輛車

### Requirement: Score follows actual hit time
系統 SHALL 依命中當下計分：已過時間小於25秒時，擊中遠光燈加1、一般大燈扣1；大於等於25秒且小於30秒時，分別加2、扣2。分數可為負數；揮空及未擊中的車不改變分數。

#### Scenario: Ordinary high beam hit
- **WHEN** 玩家在第25秒之前擊中遠光燈車
- **THEN** 分數增加1

#### Scenario: Ordinary hit and negative score
- **WHEN** 分數0且玩家在第10秒擊中一般大燈車
- **THEN** 分數變成-1

#### Scenario: Boundary and spawn time do not change multiplier
- **WHEN** 車輛在第24秒出現，在第25秒或之後且第30秒之前被擊中
- **THEN** 遠光燈加2分，一般大燈扣2分

#### Scenario: Empty swing or missed vehicle
- **WHEN** 玩家揮空或讓車輛通過
- **THEN** 分數保持不變

#### Scenario: Expiry takes precedence
- **WHEN** 命中判定時間大於等於30秒
- **THEN** 不再計分，結算分數保持不變

### Requirement: Impact effects do not extend the session
系統 SHALL 在重擊停頓或其他視覺效果期間持續計算局次時間，不因命中延長30秒局長。

#### Scenario: Impact near timeout
- **WHEN** 第29.98秒發生有效重擊且效果尚未播放完畢
- **THEN** 該次命中正常計分，但局次仍在第30秒結算
