import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { router } from "./routes";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}