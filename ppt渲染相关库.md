## OpenMAIC 项目中 PPT 渲染相关库
### 1. 已有的核心库
库名 用途 代码引用位置 katex LaTeX 数学公式渲染 components/slide-renderer/components/element/LatexElement/ motion 动画效果（聚光灯、激光笔、元素动画） components/slide-renderer/Editor/SpotlightOverlay.tsx 、 LaserOverlay.tsx @xyflow/react 流程图/节点图（项目制学习场景） lib/generation/prompts/templates/ echarts 数据可视化图表 components/slide-renderer/components/element/ChartElement/

### 2. 其他重要的 PPT 相关库
库名 用途 代码引用位置 pptxgenjs 导出 PPTX 文件（workspace 包） packages/pptxgenjs/ pptxtojson PPT 文件解析 lib/export/ svg-arc-to-cubic-bezier SVG 路径处理（形状元素） components/slide-renderer/components/element/ShapeElement/ svg-pathdata SVG 路径数据操作 lib/export/ temml 替代 KaTeX 的数学渲染库 components/slide-renderer/components/element/LatexElement/ mathml2omml MathML 转 Office Math（workspace 包） packages/mathml2omml/ prosemirror-* 富文本编辑（文本元素） components/slide-renderer/components/element/TextElement/

### 3. 辅助库
库名 用途 clsx / tailwind-merge 类名组合 lucide-react 图标库 zustand 状态管理 nanoid 唯一 ID 生成 tinycolor2 颜色处理

### 4. 用户提到的 recharts 替代方案
项目使用的是 echarts 而不是 recharts ，位于 ChartElement 中。

### 5. 自定义 Workspace 包
项目包含两个自定义包，专门用于 PPT 导出功能：

- mathml2omml - 处理公式导出
- pptxgenjs - 定制版的 PPTX 生成库
这些都在 packages/ 目录下。