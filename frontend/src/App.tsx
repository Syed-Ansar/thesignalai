import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Guest from "@/pages/Guest";
import Admin from "@/pages/Admin";

/** Old /app/{slug} links (already-printed posters) keep working. */
function LegacyGuestRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
// No default restaurant: guests always arrive on /{restaurant slug or id}.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/app/:slug" element={<LegacyGuestRedirect />} />
      <Route path="/:slug" element={<Guest />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
