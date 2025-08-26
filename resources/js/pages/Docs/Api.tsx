import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Head } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle, Code, Copy, Download, Info, Settings, Trash2, Upload, Zap } from 'lucide-react';
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
                    <div className="mx-auto max-w-5xl">
                        {/* Hero Section */}
                        <div className="mb-12 text-center">
                            <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
                                <span className="gradient-primary-text">Fucking</span> File API
                            </h1>
                            <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                                RESTful API for blazing fast file hosting. No authentication, no bullshit.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Badge variant="secondary" className="px-3 py-1">
                                    <Zap className="mr-1 h-3 w-3" />
                                    REST API
                                </Badge>
                                <Badge variant="secondary" className="px-3 py-1">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    No Auth Required
                                </Badge>
                                <Badge variant="secondary" className="px-3 py-1">
                                    <Code className="mr-1 h-3 w-3" />
                                    JSON Responses
                                </Badge>
                            </div>
                        </div>

                        {/* Quick Start Section */}
                        <div className="mb-16">
                            <div className="mb-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">Quick Start</h2>
                                <p className="text-muted-foreground">Get started with the API in seconds</p>
                            </div>

                            <div className="space-y-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <span className="text-sm font-bold text-primary">1</span>
                                            </div>
                                            Base URL
                                        </CardTitle>
                                        <CardDescription>All API endpoints are relative to this base URL</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <CodeBlock code={`${window.location.origin}/api`} language="text" id="base-url" />
                                    </CardContent>
                                </Card>

                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <span className="text-sm font-bold text-primary">2</span>
                                            </div>
                                            Upload a File
                                        </CardTitle>
                                        <CardDescription>Simple file upload with cURL</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <CodeBlock
                                            code={`curl -X POST ${window.location.origin}/api/upload \\
  -F "file=@example.jpg"`}
                                            language="bash"
                                            id="quick-upload"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* API Endpoints Section */}
                        <div className="mb-16">
                            <div className="mb-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">API Endpoints</h2>
                                <p className="text-muted-foreground">Complete reference for all available endpoints</p>
                            </div>
                            <Separator className="mb-8" />

                            <div className="space-y-8">
                                {/* Upload File */}
                                <Card className="border-l-4 border-l-green-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                                                <Upload className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Upload File</span>
                                                <Badge variant="outline" className="ml-2">
                                                    POST
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">
                                            Upload a single file. Files larger than {formatFileSize(chunkThreshold)} should use chunked upload.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/upload</code>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Parameters</h4>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="destructive" className="text-xs">
                                                            required
                                                        </Badge>
                                                        <code className="text-sm">file</code>
                                                        <span className="text-sm text-muted-foreground">- The file to upload</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-xs">
                                                            optional
                                                        </Badge>
                                                        <code className="text-sm">expiration_days</code>
                                                        <span className="text-sm text-muted-foreground">- Days until expiration (1-365)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                                <CodeBlock
                                                    code={`curl -X POST ${window.location.origin}/api/upload \\
  -F "file=@example.jpg" \\
  -F "expiration_days=30"`}
                                                    language="bash"
                                                    id="upload-curl"
                                                />
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">JavaScript Example</h4>
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
                                        </div>

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Response</h4>
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
                                <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                                <Info className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Get File Information</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Retrieve metadata about an uploaded file</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/file/{`{file_id}`}/info</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                                <CodeBlock
                                                    code={`curl ${window.location.origin}/api/file/abc123/info`}
                                                    language="bash"
                                                    id="info-curl"
                                                />
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Response</h4>
                                                <CodeBlock
                                                    code={`{
  "success": true,
  "data": {
    "file_id": "abc123",
    "original_name": "example.jpg",
    "file_size": 1048576,
    "human_file_size": "1.00 MB",
    "mime_type": "image/jpeg",
    "download_url": "${window.location.origin}/f/abc123",
    "preview_url": "${window.location.origin}/p/abc123",
    "info_url": "${window.location.origin}/file/abc123",
    "expires_at": "2024-02-15T10:30:00.000Z",
    "is_expired": false,
    "created_at": "2024-01-15T10:30:00.000Z",
    "can_delete": true
  }
}`}
                                                    language="json"
                                                    id="info-response"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Download File */}
                                <Card className="border-l-4 border-l-purple-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                                                <Download className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Download File</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Direct file download with proper headers</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/f/{`{file_id}`}</code>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Features</h4>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm">Range requests supported (resume downloads)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm">Proper Content-Disposition headers</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm">Download manager compatible</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm">Original filename preserved</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock code={`curl -O -J ${window.location.origin}/f/abc123`} language="bash" id="download-curl" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Delete File */}
                                <Card className="border-l-4 border-l-red-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                                                <Trash2 className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Delete File</span>
                                                <Badge variant="outline" className="ml-2">
                                                    DELETE
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Delete a file using the owner's delete token</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/file/{`{file_id}`}</code>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Headers</h4>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">X-Delete-Token: {`{delete_token}`}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                                <CodeBlock
                                                    code={`curl -X DELETE ${window.location.origin}/api/file/abc123 \\
  -H "X-Delete-Token: del_xyz789"`}
                                                    language="bash"
                                                    id="delete-curl"
                                                />
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Response</h4>
                                                <CodeBlock
                                                    code={`{
  "success": true,
  "message": "File deleted successfully"
}`}
                                                    language="json"
                                                    id="delete-response"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Advanced Features Section */}
                        <div className="mb-16">
                            <div className="mb-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">Advanced Features</h2>
                                <p className="text-muted-foreground">For large files and complex scenarios</p>
                            </div>
                            <Separator className="mb-8" />

                            <div className="space-y-8">
                                {/* Chunked Upload */}
                                <Card className="border-l-4 border-l-orange-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                                                <Upload className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Chunked Upload</span>
                                                <Badge variant="outline" className="ml-2">
                                                    POST
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">
                                            For files larger than {formatFileSize(chunkThreshold)} or unreliable connections
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-8">
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                                                        1
                                                    </div>
                                                    <h4 className="text-lg font-semibold">Initialize Session</h4>
                                                </div>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/upload/init</code>
                                                </div>
                                                <CodeBlock
                                                    code={`curl -X POST ${window.location.origin}/api/upload/init \\
  -H "Content-Type: application/json" \\
  -d '{
    "original_name": "large-file.zip",
    "total_size": 104857600,
    "chunk_size": 5242880
  }'`}
                                                    language="bash"
                                                    id="chunked-init"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                                                        2
                                                    </div>
                                                    <h4 className="text-lg font-semibold">Upload Chunks</h4>
                                                </div>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/upload/chunk</code>
                                                </div>
                                                <CodeBlock
                                                    code={`curl -X POST ${window.location.origin}/api/upload/chunk \\
  -F "session_id=session_abc123" \\
  -F "chunk_index=0" \\
  -F "chunk=@chunk_0.bin"`}
                                                    language="bash"
                                                    id="chunked-upload"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                                                        3
                                                    </div>
                                                    <h4 className="text-lg font-semibold">Finalize Upload</h4>
                                                </div>
                                                <div className="rounded-lg bg-muted p-3">
                                                    <code className="font-mono text-sm">/upload/finalize</code>
                                                </div>
                                                <CodeBlock
                                                    code={`curl -X POST ${window.location.origin}/api/upload/finalize \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "session_abc123",
    "expiration_days": 30
  }'`}
                                                    language="bash"
                                                    id="chunked-finalize"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                {/* Resume Chunked Upload */}
                                <Card className="border-l-4 border-l-cyan-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                                                <Upload className="h-5 w-5 text-cyan-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Resume Chunked Upload</span>
                                                <Badge variant="outline" className="ml-2">
                                                    POST
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Resume an interrupted chunked upload session</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/upload/chunk</code>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Parameters</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="destructive" className="text-xs">
                                                        required
                                                    </Badge>
                                                    <code className="text-sm">action</code>
                                                    <span className="text-sm text-muted-foreground">- Set to "resume"</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="destructive" className="text-xs">
                                                        required
                                                    </Badge>
                                                    <code className="text-sm">session_id</code>
                                                    <span className="text-sm text-muted-foreground">- Upload session ID</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock
                                                code={`curl -X POST ${window.location.origin}/api/upload/chunk \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "resume",
    "session_id": "session_abc123"
  }'`}
                                                language="bash"
                                                id="resume-upload"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Get Session Details */}
                                <Card className="border-l-4 border-l-indigo-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                                                <Info className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Get Session Details</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Get details about a chunked upload session</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/upload/session/{`{session_id}`}</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock
                                                code={`curl ${window.location.origin}/api/upload/session/session_abc123`}
                                                language="bash"
                                                id="session-details"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Get File Duplicates */}
                                <Card className="border-l-4 border-l-pink-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                                                <Info className="h-5 w-5 text-pink-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Get File Duplicates</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Get information about duplicate files</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/file/{`{file_id}`}/duplicates</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock
                                                code={`curl ${window.location.origin}/api/file/abc123/duplicates`}
                                                language="bash"
                                                id="file-duplicates"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Admin Endpoints Section */}
                        <div className="mb-16">
                            <div className="mb-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">Admin Endpoints</h2>
                                <p className="text-muted-foreground">Administrative and statistics endpoints</p>
                            </div>
                            <Separator className="mb-8" />

                            <div className="space-y-8">
                                {/* Get Statistics */}
                                <Card className="border-l-4 border-l-emerald-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                                <Settings className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Get Statistics</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Get storage and system statistics</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/stats</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                                <CodeBlock code={`curl ${window.location.origin}/api/stats`} language="bash" id="stats-curl" />
                                            </div>

                                            <div>
                                                <h4 className="mb-3 text-lg font-semibold">Response</h4>
                                                <CodeBlock
                                                    code={`{
  "success": true,
  "data": {
    "total_files": 1250,
    "total_size": 5368709120,
    "total_size_human": "5.00 GB",
    "active_files": 1200,
    "expired_files": 50,
    "duplicate_groups": 25,
    "total_duplicate_files": 75,
    "space_saved_bytes": 1073741824,
    "space_saved_human": "1.00 GB"
  }
}`}
                                                    language="json"
                                                    id="stats-response"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Cleanup Expired Files */}
                                <Card className="border-l-4 border-l-amber-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                                                <Trash2 className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Cleanup Expired Files</span>
                                                <Badge variant="outline" className="ml-2">
                                                    DELETE
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Remove expired files from storage</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/cleanup</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock
                                                code={`curl -X DELETE ${window.location.origin}/api/cleanup`}
                                                language="bash"
                                                id="cleanup-curl"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Get Upload Metrics */}
                                <Card className="border-l-4 border-l-teal-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
                                                <Info className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div>
                                                <span className="text-xl">Get Upload Metrics</span>
                                                <Badge variant="outline" className="ml-2">
                                                    GET
                                                </Badge>
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-base">Get chunked upload performance metrics</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Endpoint</h4>
                                            <div className="rounded-lg bg-muted p-3">
                                                <code className="font-mono text-sm">/upload/metrics</code>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">cURL Example</h4>
                                            <CodeBlock code={`curl ${window.location.origin}/api/upload/metrics`} language="bash" id="metrics-curl" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Reference Section */}
                        <div>
                            <div className="mb-8 text-center">
                                <h2 className="mb-2 text-2xl font-bold">Reference</h2>
                                <p className="text-muted-foreground">Error handling, limits, and system information</p>
                            </div>
                            <Separator className="mb-8" />

                            <div className="space-y-8">
                                {/* Error Responses */}
                                <Card className="border-l-4 border-l-red-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                                                <AlertCircle className="h-5 w-5 text-red-600" />
                                            </div>
                                            <span className="text-xl">Error Responses</span>
                                        </CardTitle>
                                        <CardDescription className="text-base">Standard error format for all endpoints</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <h4 className="mb-3 text-lg font-semibold">Error Format</h4>
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
                                            <h4 className="mb-3 text-lg font-semibold">Common Error Codes</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        400
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">VALIDATION_ERROR</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">Invalid request parameters</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        413
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">FILE_TOO_LARGE</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">File exceeds size limit</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        404
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">FILE_NOT_FOUND</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">File doesn't exist or expired</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        500
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">UPLOAD_ERROR</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">General upload failure</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        401
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">MISSING_DELETE_TOKEN</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">Delete token is required</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        404
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">DELETE_FAILED</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">File not found or invalid delete token</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        500
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">INFO_ERROR</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">Failed to retrieve file information</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        500
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">DELETE_ERROR</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">Failed to delete file</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        500
                                                    </Badge>
                                                    <div>
                                                        <code className="font-mono text-sm">STATS_ERROR</code>
                                                        <p className="mt-1 text-sm text-muted-foreground">Failed to retrieve statistics</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rate Limits */}
                                <Card className="border-l-4 border-l-yellow-500">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                                                <Settings className="h-5 w-5 text-yellow-600" />
                                            </div>
                                            <span className="text-xl">System Limits</span>
                                        </CardTitle>
                                        <CardDescription className="text-base">Current system limitations and restrictions</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">Max file size</span>
                                                    <Badge variant="outline">{formatFileSize(maxFileSize)}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">Chunked threshold</span>
                                                    <Badge variant="outline">{formatFileSize(chunkThreshold)}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">Rate limiting</span>
                                                    <Badge variant="secondary">None</Badge>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">Authentication</span>
                                                    <Badge variant="secondary">Not required</Badge>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">File retention</span>
                                                    <Badge variant="outline">1-365 days</Badge>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                    <span className="font-medium">HTTP methods</span>
                                                    <Badge variant="outline">GET, POST, DELETE</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
