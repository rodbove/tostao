import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Timeline from "./pages/Timeline";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
