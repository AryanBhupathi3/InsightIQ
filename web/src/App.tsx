import { HashRouter, Routes, Route } from "react-router-dom";
import { DatasetProvider } from "./state/DatasetContext";
import { ThemeProvider } from "./state/ThemeContext";
import Home from "./pages/Home";
import Workbench from "./pages/Workbench";
import BuyerWorkbench from "./pages/BuyerWorkbench";

export default function App() {
  return (
    <ThemeProvider>
      <DatasetProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app/*" element={<Workbench />} />
            <Route path="/buyer/*" element={<BuyerWorkbench />} />
          </Routes>
        </HashRouter>
      </DatasetProvider>
    </ThemeProvider>
  );
}
