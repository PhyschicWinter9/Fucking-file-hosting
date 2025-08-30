import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

export default function Error503() {
    return (
        <Layout
            title="503 - Service Unavailable | Fucking File Hosting"
            description="We're temporarily down for maintenance. We'll be back soon with blazing fast file hosting."
            image="/images/og-error.png"
        >
            <div className="container-responsive py-16 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    {/* Error Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover pulse-glow flex h-24 w-24 items-center justify-center rounded-full sm:h-32 sm:w-32">
                            <Wrench className="h-12 w-12 text-white sm:h-16 sm:w-16" />
                        </div>
                    </div>

                    {/* Error Message */}
                    <div className="mb-12">
                        <h1 className="text-6xl font-bold mb-4 sm:text-8xl">
                            <span className="gradient-primary-text">503</span>
                        </h1>
                        <h2 className="text-2xl font-semibold mb-6 sm:text-3xl">Service Unavailable</h2>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            We're temporarily down for maintenance to make our service even more <span className="font-semibold text-primary">fucking fast</span>. 
                            We'll be back online shortly with improvements.
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