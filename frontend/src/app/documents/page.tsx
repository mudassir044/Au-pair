
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Document {
  id: string
  fileName: string
  fileType: string
  fileUrl: string
  documentType: string
  uploadedAt: string
  isVerified: boolean
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.push('/auth/login')
      return
    }

    fetchDocuments(token)
  }, [router])

  const fetchDocuments = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8001/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !documentType) {
      alert('Please select a file and document type')
      return
    }

    const token = localStorage.getItem('accessToken')
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('documentType', documentType)

    setUploading(true)

    try {
      const response = await fetch('http://localhost:8001/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        setSelectedFile(null)
        setDocumentType('')
        // Refresh documents
        fetchDocuments(token!)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.message}`)
      }
    } catch (error) {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const token = localStorage.getItem('accessToken')

    try {
      const response = await fetch(`http://localhost:8001/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        // Refresh documents
        fetchDocuments(token!)
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      alert('Failed to delete document')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('document') || fileType.includes('word')) return '📝'
    return '📎'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold">Documents</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="PASSPORT">Passport</option>
                <option value="ID_CARD">ID Card</option>
                <option value="DRIVER_LICENSE">Driver's License</option>
                <option value="BACKGROUND_CHECK">Background Check</option>
                <option value="MEDICAL_CERTIFICATE">Medical Certificate</option>
                <option value="REFERENCE_LETTER">Reference Letter</option>
                <option value="CV_RESUME">CV/Resume</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFileUpload}
                disabled={uploading || !selectedFile || !documentType}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>Supported formats: PDF, JPG, PNG, DOC, DOCX (max 10MB)</p>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No documents uploaded yet</div>
              <p className="text-sm text-gray-400">
                Upload your documents to verify your identity and build trust with potential matches.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((document) => (
                <div key={document.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">
                        {getDocumentIcon(document.fileType)}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {document.fileName}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {document.documentType.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            Uploaded {formatDate(document.uploadedAt)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            document.isVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {document.isVerified ? '✓ Verified' : '⏳ Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        View
                      </a>
                      <button
                        onClick={() => deleteDocument(document.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Requirements */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Document Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">For Au Pairs:</h4>
              <ul className="space-y-1">
                <li>• Valid passport/ID</li>
                <li>• Background check</li>
                <li>• Medical certificate</li>
                <li>• Reference letters</li>
                <li>• CV/Resume</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">For Host Families:</h4>
              <ul className="space-y-1">
                <li>• ID verification</li>
                <li>• Proof of residence</li>
                <li>• Background check (optional)</li>
                <li>• Family references</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
