# AI Development Rules for WhatsApp Manager

This document outlines the technical stack and specific library usage rules to ensure consistency, maintainability, and adherence to project standards.

## Tech Stack Overview

1.  **Framework:** React (v18) with Vite for fast development.
2.  **Language:** TypeScript for type safety.
3.  **Styling:** Tailwind CSS for utility-first styling and responsive design.
4.  **UI Library:** shadcn/ui (built on Radix UI primitives) for high-quality, accessible components.
5.  **Routing:** React Router DOM for client-side navigation.
6.  **Data Management:** TanStack Query (React Query) for server state management, caching, and data synchronization.
7.  **Form Handling:** React Hook Form for form state management, paired with Zod for schema validation.
8.  **Icons:** Lucide React for all iconography.
9.  **Notifications:** Sonner for modern, non-blocking toasts.

## Library Usage Rules

| Feature | Recommended Library/Tool | Specific Rule |
| :--- | :--- | :--- |
| **UI Components** | shadcn/ui (Radix UI) | Always use existing shadcn/ui components. If a component is missing, create a new, small component file in `src/components/`. |
| **Styling** | Tailwind CSS | Use Tailwind utility classes exclusively for all styling. Ensure designs are responsive. |
| **Routing** | `react-router-dom` | Use `BrowserRouter`, `Routes`, and `Route`. Keep main routes in `src/App.tsx`. |
| **Data Fetching/Caching** | `@tanstack/react-query` | Use `useQuery` and `useMutation` for all asynchronous data operations. |
| **Forms & Validation** | `react-hook-form` & `zod` | Use `react-hook-form` for form state and `zod` for defining validation schemas. Use the `@hookform/resolvers` package. |
| **Icons** | `lucide-react` | All icons must be imported from `lucide-react`. |
| **Notifications** | `sonner` | Use the `sonner` component for displaying success/error/info messages. The component is already included in `src/App.tsx`. |
| **File Structure** | N/A | Components go into `src/components/`, pages into `src/pages/`, and hooks into `src/hooks/`. |