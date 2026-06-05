# #game-container 固定尺寸修改实施指南

## 概述

本文档详细说明了如何修改 #game-container 的 CSS 样式，为其添加固定尺寸并确保其作为所有绝对定位元素的"地基"。

## 当前样式分析

在 `css/style.css` 文件中，#game-container 的主要定义位于第 139-153 行：

```css
#game-container {
  width: 100%;
  height: 100%;
  max-width: var(--board-max-width, 393px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(
      180deg,
      rgba(255, 225, 204, 0.1) 0%,
      rgba(255, 204, 172, 0.15) 50%,
      rgba(221, 170, 139, 0.2) 100%
    ),
    url("../assets/bg/overlay.png") center/cover no-repeat;
  background-color: #9f9e8b;
  border-radius: 64px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
  transition: background 0.8s ease;
}
```

## 所需修改

需要将 #game-container 的宽度和高度修改为固定值：

- width: 430px
- height: 932px

注意：该元素已经具有正确的 position 和 overflow 属性：

- position: relative （作为绝对定位元素的地基）
- overflow: hidden （隐藏超出边界的内容）

## 修改步骤

### 步骤 1: 修改主样式定义

打开 `css/style.css` 文件，找到第 139 行的 #game-container 样式定义，将：

```css
width: 100%;
height: 100%;
max-width: var(--board-max-width, 393px);
```

修改为：

```css
width: 430px;
height: 932px;
max-width: var(--board-max-width, 393px);
```

### 步骤 2: 检查响应式设计影响

由于我们设置了固定尺寸，需要检查以下媒体查询是否需要相应调整：

1. 桌面端媒体查询（第 4424-4439 行）：

```css
@media (min-width: 501px) {
  #game-container {
    max-width: min(402px, 92vh * 402 / 874);
    height: min(874px, 92vh);
    box-shadow: 0 0 100px rgba(0, 0, 0, 0.6);
  }
}
```

可能需要根据新的固定尺寸调整这些值。

2. 移动端和其他响应式媒体查询也可能需要相应调整。

### 步骤 3: 测试修改效果

在浏览器中打开游戏，检查以下内容：

1. #game-container 是否正确显示为 430px × 932px 的固定尺寸
2. 所有绝对定位的子元素是否正确定位
3. 响应式设计是否仍然正常工作
4. 移动端和桌面端显示是否正常

## 注意事项

1. 固定尺寸可能会影响响应式设计，请确保在各种屏幕尺寸上测试效果
2. 如果需要保持某些响应式特性，可以考虑使用 min-width/min-height 或 max-width/max-height 属性
3. 确保修改不会影响到其他依赖于 #game-container 尺寸的元素定位
