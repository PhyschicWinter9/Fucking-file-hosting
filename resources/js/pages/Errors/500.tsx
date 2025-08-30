import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error500() {
    return (
        <Layout
            title="500 - Server Error | Fucking File Hosting"
            description="Something went wrong on our end. We're working to fix it. Upload files instantly with complete privacy."
            image="/images/og-error.png"
        >
            <div className="container-responsive py-16 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    {/* Error Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover pulse-glow flex h-24 w-24 items-center justify-center rounded-full sm:h-32 sm:w-32">
                            <AlertCircle className="h-12 w-12 text-white sm:h-16 sm:w-16" />
                        </div>
                    </div>

                    {/* Error Message */}
                    <div className="mb-12">
                        <h1 className="text-6xl font-bold mb-4 sm:text-8xl">
                            <span className="gradient-primary-text">500</span>
                        </h1>
                        <h2 className="text-2xl font-semibold mb-6 sm:text-3xl">Server Error</h2>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            Well, this is <span className="font-semibold text-primary">fucking embarrassing</span>. 
                            Something went wrong on our end, but don't worry - we're on it and your files are safe.
                        </p>
                        
                        <Button asChild size="lg" className="btn-hover-scale">
                            <a href="/">Go to Homepage</a>
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}