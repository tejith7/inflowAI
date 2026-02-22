# 🧠 InfoWise - Your Intelligent Internal Knowledge Hub

[![Built with Firebase Studio](https://img.shields.io/badge/Built%20with-Firebase%20Studio-orange)](https://firebase.google.com/studio)
[![Powered by Genkit](https://img.shields.io/badge/Powered%20by-Genkit-blue)](https://firebase.google.com/docs/genkit)
[![Tech Stack: Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

InfoWise is a modern, AI-powered knowledge base designed for internal company use. It allows employees to get instant, accurate answers to their questions about company policies, procedures, and internal documentation through a conversational chat interface.

The backend is powered by Google's Genkit and Gemini models, with a secure and scalable infrastructure built on Firebase.

---

## ✨ Key Features

-   **🤖 AI-Powered Chatbot**: A conversational interface to query your entire knowledge base using natural language.
-   **📚 Intelligent Document Ingestion**: Easily add new knowledge by pasting text, uploading PDFs, or simply providing a URL. The AI automatically processes and titles the content.
-   **🧠 Context-Aware Conversations**: The chatbot remembers the conversation history to understand follow-up questions and provide relevant answers.
-   **🔐 Secure & Role-Based**: Built-in authentication and a role-based access control system, with a dedicated admin dashboard.
-   **👤 User Management**: Administrators can easily view all users and manage admin privileges from the UI.
-   **🎨 Modern, Premium UI**: A clean, dark-mode-first interface inspired by top-tier SaaS products, built with Tailwind CSS and shadcn/ui.
-   **⚡️ Blazing Fast**: Built with the Next.js App Router and Turbopack for a speedy, responsive experience.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
-   **AI & GenAI**: [Genkit](https://firebase.google.com/docs/genkit) & [Google Gemini](https://ai.google.dev/)
-   **Backend & DB**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm or yarn

### 1. Installation

Clone the repository and install the dependencies.

```bash
npm install
```

### 2. Environment Setup

The application uses Google's Generative AI. You need to provide an API key to enable the AI features.

1.  Create an API key from the [Google AI Studio](https://makersuite.google.com/app/apikey).
2.  In the root of your project, create a file named `.env.local`.
3.  Add your API key to the file:

    ```env
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```

### 3. Running the Development Server

Start the Next.js development server.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔥 Firebase & Admin Setup

The application is tightly integrated with Firebase for authentication and database storage. Security rules are pre-configured to ensure data privacy and integrity.

### Setting Up the First Administrator

To access the admin dashboard and manage users/documents, you must manually assign the first admin role.

1.  **Sign Up**: Create an account in the application.
2.  **Get User UID**: Go to the **Firebase Console** > **Authentication** > **Users** tab and copy the **User UID** of the account you just created.
3.  **Create Admin Role**:
    -   Go to the **Firestore Database** section in the Firebase Console.
    -   Create a new collection with the ID `roles_admin`.
    -   Create a new document in this collection, using the **User UID** you copied as the **Document ID**.
    -   You can add a field like `assignedAt` with a timestamp, but the document's existence is all that's needed.

Once completed, the user will have admin privileges across the application.
