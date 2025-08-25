import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Code, Copy, Download, Info, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

interface ApiDocsProps {
    maxFileSize: number;
    chunkThreshold: number;
}

export default function ApiDocs({ maxFileSize, chunkThreshold }: ApiDocsProps) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const copyToClipboard = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
        <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code className={`language-${language}`}>{code}</code>
            </pre>
            <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(code, id)}>
                {copiedCode === id ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );

    return (
        <>
            <Head title="API Documentation - Fucking File Hosting" />

            <div className="min-h-screen bg-background">
                {/* Header */}
                <header className="border-b border-border/40 bg-background/95 backdrop-blur">
                    <div className="container mx-auto px-4 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <Button variant="ghost" size="sm" asChild>
                                    <a href="/" className="flex items-center">
                                        <ArrowLeft className="mr-1 h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Back to Upload</span>
                                        <span className="sm:hidden">Back</span>
                                    </a>
                                </Button>
                                <div className="flex items-center space-x-1.5 sm:space-x-2">
                                    <Code className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                                    <span className="text-lg font-bold sm:text-xl">
                                        <span className="hidden sm:inline">Fucking File API</span>
                                        <span className="sm:hidden">API</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-6 sm:py-8">
                    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
                        {/* Introduction */}
                        <div className="text-center">
                            <h1 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl lg:text-4xl">
                                <span className="gradient-primary-text">Fucking</span> File API Documentation
                            </h1>
                            <p className="mb-4 text-base text-muted-foreground sm:mb-6 sm:text-lg">
                                RESTful API for blazing fast file hosting. No authentication, no bullshit.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                                <Badge variant="secondary" className="text-xs sm:text-sm">REST API</Badge>
                                <Badge variant="secondary" className="text-xs sm:text-sm">No Auth Required</Badge>
                                <Badge variant="secondary" className="text-xs sm:text-sm">JSON Responses</Badge>
                            </div>
                        </div>

                        {/* Base URL */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Base URL</CardTitle>
                                <CardDescription>All API endpoints are relative to this base URL</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CodeBlock code={`${window.location.origin}/api`} language="text" id="base-url" />
                            </CardContent>
                        </Card>

                        {/* Upload File */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Upload className="h-5 w-5" />
                                    <span>Upload File</span>
                                </CardTitle>
                                <CardDescription>
                                    Upload a single file. Files larger than {formatFileSize(chunkThreshold)} should use chunked upload.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">Endpoint</h4>
                                    <Badge variant="outline" className="mr-2">
                                        POST
                                    </Badge>
                                    <code>/upload</code>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Parameters</h4>
                                    <ul className="space-y-1 text-sm">
                                        <li>
                                            <code>file</code> (required) - The file to upload
                                        </li>
                                        <li>
                                            <code>expiration_days</code> (optional) - Days until expiration (1-365)
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">cURL Example</h4>
                                    <CodeBlock
                                        code={`curl -X POST ${window.location.origin}/api/upload \\
  -F "file=@example.jpg" \\
  -F "expiration_days=30"`}
                                        language="bash"
                                        id="upload-curl"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">JavaScript Example</h4>
                                    <CodeBlock
                                        code={`const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('expiration_days', '30');

const response = await fetch('${window.location.origin}/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.download_url);`}
                                        language="javascript"
                                        id="upload-js"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Response</h4>
                                    <CodeBlock
                                        code={`{
  "success": true,
  "data": {
    "file_id": "abc123",
    "original_name": "example.jpg",
    "file_size": 1048576,
    "human_size": "1.00 MB",
    "mime_type": "image/jpeg",
    "download_url": "${window.location.origin}/f/abc123",
    "preview_url": "${window.location.origin}/p/abc123",
    "info_url": "${window.location.origin}/file/abc123",
    "expires_at": "2024-02-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "delete_token": "del_xyz789"
  }
}`}
                                        language="json"
                                        id="upload-response"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Get File Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Info className="h-5 w-5" />
                                    <span>Get File Information</span>
                                </CardTitle>
                                <CardDescription>Retrieve metadata about an uploaded file</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">Endpoint</h4>
                                    <Badge variant="outline" className="mr-2">
                                        GET
                                    </Badge>
                                    <code>/file/{`{file_id}`}</code>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">cURL Example</h4>
                                    <CodeBlock code={`curl ${window.location.origin}/api/file/abc123`} language="bash" id="info-curl" />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Response</h4>
                                    <CodeBlock
                                        code={`{
  "success": true,
  "data": {
    "file_id": "abc123",
    "original_name": "example.jpg",
    "file_size": 1048576,
    "human_size": "1.00 MB",
    "mime_type": "image/jpeg",
    "download_url": "${window.location.origin}/f/abc123",
    "preview_url": "${window.location.origin}/p/abc123",
    "info_url": "${window.location.origin}/file/abc123",
    "expires_at": "2024-02-15T10:30:00.000Z",
    "is_expired": false,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}`}
                                        language="json"
                                        id="info-response"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Download File */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Download className="h-5 w-5" />
                                    <span>Download File</span>
                                </CardTitle>
                                <CardDescription>Direct file download with proper headers</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">Endpoint</h4>
                                    <Badge variant="outline" className="mr-2">
                                        GET
                                    </Badge>
                                    <code>/f/{`{file_id}`}</code>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Features</h4>
                                    <ul className="space-y-1 text-sm">
                                        <li>• Range requests supported (resume downloads)</li>
                                        <li>• Proper Content-Disposition headers</li>
                                        <li>• Download manager compatible</li>
                                        <li>• Original filename preserved</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">cURL Example</h4>
                                    <CodeBlock code={`curl -O -J ${window.location.origin}/f/abc123`} language="bash" id="download-curl" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delete File */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Trash2 className="h-5 w-5" />
                                    <span>Delete File</span>
                                </CardTitle>
                                <CardDescription>Delete a file using the owner's delete token</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">Endpoint</h4>
                                    <Badge variant="outline" className="mr-2">
                                        DELETE
                                    </Badge>
                                    <code>/file/{`{file_id}`}</code>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Headers</h4>
                                    <code>Authorization: Bearer {`{delete_token}`}</code>
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">cURL Example</h4>
                                    <CodeBlock
                                        code={`curl -X DELETE ${window.location.origin}/api/file/abc123 \\
  -H "Authorization: Bearer del_xyz789"`}
                                        language="bash"
                                        id="delete-curl"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Response</h4>
                                    <CodeBlock
                                        code={`{
  "success": true,
  "message": "File deleted successfully"
}`}
                                        language="json"
                                        id="delete-response"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Chunked Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Upload className="h-5 w-5" />
                                    <span>Chunked Upload</span>
                                </CardTitle>
                                <CardDescription>For files larger than {formatFileSize(chunkThreshold)} or unreliable connections</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">1. Initialize Session</h4>
                                    <Badge variant="outline" className="mr-2">
                                        POST
                                    </Badge>
                                    <code>/chunked-upload</code>
                                    <CodeBlock
                                        code={`curl -X POST ${window.location.origin}/api/chunked-upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "initialize",
    "original_name": "large-file.zip",
    "total_size": 104857600,
    "chunk_size": 5242880
  }'`}
                                        language="bash"
                                        id="chunked-init"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">2. Upload Chunks</h4>
                                    <Badge variant="outline" className="mr-2">
                                        POST
                                    </Badge>
                                    <code>/chunked-upload</code>
                                    <CodeBlock
                                        code={`curl -X POST ${window.location.origin}/api/chunked-upload \\
  -F "action=upload_chunk" \\
  -F "session_id=session_abc123" \\
  -F "chunk_index=0" \\
  -F "chunk=@chunk_0.bin"`}
                                        language="bash"
                                        id="chunked-upload"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">3. Finalize Upload</h4>
                                    <Badge variant="outline" className="mr-2">
                                        POST
                                    </Badge>
                                    <code>/finalize-upload</code>
                                    <CodeBlock
                                        code={`curl -X POST ${window.location.origin}/api/finalize-upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "session_abc123",
    "expiration_days": 30
  }'`}
                                        language="bash"
                                        id="chunked-finalize"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Error Responses */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Error Responses</CardTitle>
                                <CardDescription>Standard error format for all endpoints</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="mb-2 font-semibold">Error Format</h4>
                                    <CodeBlock
                                        code={`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "additional": "error details"
    }
  }
}`}
                                        language="json"
                                        id="error-format"
                                    />
                                </div>

                                <div>
                                    <h4 className="mb-2 font-semibold">Common Error Codes</h4>
                                    <ul className="space-y-1 text-sm">
                                        <li>
                                            <code>VALIDATION_ERROR</code> - Invalid request parameters
                                        </li>
                                        <li>
                                            <code>FILE_TOO_LARGE</code> - File exceeds size limit
                                        </li>
                                        <li>
                                            <code>FILE_NOT_FOUND</code> - File doesn't exist or expired
                                        </li>
                                        <li>
                                            <code>UPLOAD_ERROR</code> - General upload failure
                                        </li>
                                        <li>
                                            <code>UNAUTHORIZED</code> - Invalid delete token
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rate Limits */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Rate Limits & Restrictions</CardTitle>
                                <CardDescription>Current system limitations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        • <strong>Max file size:</strong> {formatFileSize(maxFileSize)}
                                    </li>
                                    <li>
                                        • <strong>Chunked upload threshold:</strong> {formatFileSize(chunkThreshold)}
                                    </li>
                                    <li>
                                        • <strong>Rate limiting:</strong> None (unlimited uploads)
                                    </li>
                                    <li>
                                        • <strong>Authentication:</strong> Not required
                                    </li>
                                    <li>
                                        • <strong>File retention:</strong> 1-365 days (configurable)
                                    </li>
                                    <li>
                                        • <strong>Supported methods:</strong> GET, POST, DELETE
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
