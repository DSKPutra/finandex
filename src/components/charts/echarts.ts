// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tree-shaken ECharts build (loaded lazily with the first chart).
import { BarChart, CandlestickChart, GraphChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  GraphicComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  CandlestickChart,
  HeatmapChart,
  GraphChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent,
  GraphicComponent,
  CanvasRenderer,
]);

export default echarts;
