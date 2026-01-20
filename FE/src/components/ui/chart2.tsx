
import {
  BarChart as _BarChart,
  Bar as _Bar,
  LineChart as _LineChart,
  Line as _Line,
  PieChart as _PieChart,
  Pie as _Pie,
  AreaChart as _AreaChart,
  Area as _Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

/* Re-export under friendly names */
export const BarChart = _BarChart;
export const Bar = _Bar;
export const LineChart = _LineChart;
export const Line = _Line;
export const PieChart = _PieChart;
export const Pie = _Pie;
export const AreaChart = _AreaChart;
export const Area = _Area;

/* Re-export the rest directly */
export {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
};
