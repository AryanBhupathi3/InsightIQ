import { HashRouter, Routes, Route } from "react-router-dom";
import { DatasetProvider } from "./state/DatasetContext";
import Home from "./pages/Home";
import Workbench from "./pages/Workbench";

export default function App() {
  return (
    <DatasetProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/*" element={<Workbench />} />
        </Routes>
      </HashRouter>
    </DatasetProvider>
  );
}
