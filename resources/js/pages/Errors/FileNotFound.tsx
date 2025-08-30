import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { FileX } from 'lucide-react';

interface FileNotFoundProps {
    fileId?: string;
}

export default function FileNotFound({ fileId }: FileNotFoundProps) {
    return (
        <Layout
            title="File Not Found | Fucking File Hosting"
            description="The file you're looking for doesn't exist or has expired. Upload new files instantly with complete privacy."
            image="/images/og-error.png"
        >
            <div className="container-responsive py-16 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    {/* Error Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover pulse-glow flex h-24 w-24 items-center justify-center rounded-full sm:h-32 sm:w-32">
                            <FileX className="h-12 w-12 text-white sm:h-16 sm:w-16" />
                        </div>
                    </div>

                    {/* Error Message */}
                    <div className="mb-12">
                        <h1 className="text-4xl font-bold mb-4 sm:text-6xl">File Not Found</h1>
                        {fileId && (
                            <p className="text-sm text-muted-foreground mb-4 font-mono break-all">
                                File ID: {fileId}
                            </p>
                        )}
                        <h2 className="text-xl font-semibold mb-6 sm:text-2xl">This file doesn't exist or has expired</h2>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            Well, that's <span className="font-semibold text-primary">fucking annoying</span>. 
                            This file either never existed or got automatically deleted after its expiration time. 
                            Upload a new file to get a fresh link.
                        </p>
                        
                        <Button asChild size="lg" className="btn-hover-scale">
                            <a href="/">Upload New File</a>
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}