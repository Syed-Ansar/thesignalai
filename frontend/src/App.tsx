import { Routes, Route } from "react-router-dom";
import Guest from "@/pages/Guest";
import Admin from "@/pages/Admin";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest />} />
      <Route path="/app/:slug" element={<Guest />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Guest />} />
    </Routes>
  );
}
