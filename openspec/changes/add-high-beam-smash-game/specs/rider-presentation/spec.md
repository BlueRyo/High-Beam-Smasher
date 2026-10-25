# Spec Delta

## Purpose

定義機車騎士第一人稱的像素風視覺體驗，透過持續前進的道路、遠近透視與燈光壓迫感建立情境，同時確保玩家能辨別車種、燈型及揮擊時機並閱讀遊戲狀態。

## ADDED Requirements

### Requirement: Pixel-art first-person rider view
系統 SHALL 使用像素風呈現夜間道路與機車騎士第一人稱視角，下方持續顯示手把及儀表板，待機時可見握住手把的雙手；揮擊時左手可離開手把，右手保持握把。

#### Scenario: Riding and swinging
- **WHEN** 玩家在局中觀察畫面並按下空白鍵
- **THEN** 手把、儀表板及右手持續可見，左手揮鐵棍後回位，畫面維持第一人稱像素風

### Requirement: Rider occupies the right lane
系統 SHALL 將騎士視角置於道路分隔線右側的車道，分隔線在畫面近處位於儀表板中心左側；對向汽機車保持在分隔線左側接近。

#### Scenario: Right-side riding perspective
- **WHEN** 玩家沿道路前進並遇到對向車輛
- **THEN** 騎士沿分隔線右側行進，對向車輛從分隔線左側接近

### Requirement: Forward road and approaching traffic
系統 SHALL 在遊戲進行中以道路、標線及環境的透視移動呈現持續前進；對向汽車與機車從遠處出現，約經2至3秒逐漸放大接近命中範圍，之後通過並離開畫面。多輛車可同時處於不同距離。

#### Scenario: Depth before impact
- **WHEN** 一輛對向車進入畫面
- **THEN** 玩家先看見遠處的小車影與燈點，再看見其持續接近，不直接在揮擊範圍突然出現

#### Scenario: Overlapping approaches
- **WHEN** 一輛車接近期間下一輛出場
- **THEN** 兩車可以同時可見，並依各自距離呈現尺寸與位置

### Requirement: Distinguishable headlight types
系統 SHALL 呈現可辨識的汽車及機車外觀，並讓一般大燈與遠光燈具有可分辨的光束、光暈或亮度特徵；一般大燈不產生遠光燈程度的全畫面過曝。

#### Scenario: Decide before swinging
- **WHEN** 玩家看到接近命中範圍的一般大燈車與遠光燈車
- **THEN** 可從畫面燈光特徵區分兩者並決定是否揮擊

### Requirement: Distance-based high beam exposure
系統 SHALL 隨未擊碎遠光燈車接近逐步提高光暈及場景過曝，通過或被擊碎後移除該車效果；多車效果須限制最大強度，保留車輛輪廓、命中時機提示、倒數與分數的可讀性。

#### Scenario: Increasing glare
- **WHEN** 未被擊碎的遠光燈車從遠處逐步接近
- **THEN** 光暈及過曝逐步增強，而非突然全白

#### Scenario: Vehicle passes without a hit
- **WHEN** 玩家漏打遠光燈車且該車通過
- **THEN** 該車的過曝效果消失，分數不變

#### Scenario: Several high beams remain readable
- **WHEN** 多輛遠光燈車同時接近
- **THEN** 過曝強度有上限，玩家仍可辨認輪廓及讀取倒數與分數

### Requirement: Readable game controls and status
系統 SHALL 在開始畫面以繁體中文說明空白鍵、辨認燈型與計分方式，在局中顯示剩餘時間、分數及尾段雙倍狀態，並以近距離提示幫助判斷命中時機；桌面視窗縮放或手機橫直向切換時保持比例及介面可讀性。

#### Scenario: Understand the round
- **WHEN** 玩家尚未開始遊戲
- **THEN** 可以看見操作、一般及尾段計分說明，且倒數尚未啟動

#### Scenario: Resize during play
- **WHEN** 桌面瀏覽器視窗尺寸改變
- **THEN** 畫面保持比例、主要介面可讀，命中範圍不因顯示尺寸改變

### Requirement: Red frame identifies the hit window
系統 SHALL 僅在可接受新揮擊且未擊中的汽機車處於有效命中距離時，顯示完整醒目的紅色外框及揮棒提示（觸控顯示 TAP!）。提示繪於過曝效果上方，離開範圍或命中後立即消失；一般大燈與遠光燈均使用相同範圍提示。

#### Scenario: Vehicle enters and leaves reach
- **WHEN** 未擊中的車輛進入有效揮擊距離
- **THEN** 亮起完整紅框及 揮棒提示；車輛通過或被命中後不再顯示該提示
