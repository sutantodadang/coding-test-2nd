import React, { useState } from "react";
import Head from "next/head";
import FileUpload from "../components/FileUpload";
import ChatInterface from "../components/ChatInterface";

export default function Home() {
  const [uploadResult, setUploadResult] = useState<any>(null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Head>
        <title>RAG-based Financial Q&A System</title>
        <meta
          name="description"
          content="AI-powered Q&A system for financial documents"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            RAG-based Financial Q&A System
          </h1>
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-gray-600 mb-2">
              Welcome to the AI-powered Q&A System! 🚀
            </p>
            <p className="text-gray-500">
              Upload a financial statement PDF and start asking intelligent
              questions about your documents.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              📄 Upload Your Document
            </h2>
            <p className="text-gray-600">
              Start by uploading a PDF file to analyze
            </p>
          </div>
          <div className="flex justify-center">
            <FileUpload onUploadComplete={setUploadResult} />
          </div>
        </div>

        {/* Chat Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              💬 Ask Questions
            </h2>
            <p className="text-gray-600">
              Chat with your document using natural language
            </p>
          </div>
          <div className="flex justify-center">
            <ChatInterface />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-gray-500 text-sm border-t border-gray-200 mt-12">
          <p>Powered by AI • Built with Next.js and TailwindCSS</p>
        </footer>
      </main>
    </div>
  );
}
