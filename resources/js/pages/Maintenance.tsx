import Layout from '@/components/Layout';
import { Wrench } from 'lucide-react';

interface MaintenanceProps {
    message?: string;
}

export default function Maintenance({
    message = "Quick server upgrade in progress. We'll be back with even faster fucking",
}: MaintenanceProps) {
    return (
        <Layout
            title="Under Maintenance | Fucking File Hosting"
            description="Quick server upgrade in progress. We'll be back with even faster fucking file hosting!"
            image="/images/og-maintenance.png"
        >
            <div className="container-responsive py-16 sm:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    {/* Maintenance Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover pulse-glow flex h-24 w-24 items-center justify-center rounded-full sm:h-32 sm:w-32">
                            <Wrench className="h-12 w-12 text-white sm:h-16 sm:w-16" />
                        </div>
                    </div>

                    {/* Maintenance Message */}
                    <div className="mb-12">
                        <h1 className="mb-6 text-4xl font-bold sm:text-6xl">
                            <span className="gradient-primary-text">Under Maintenance</span>
                        </h1>

                        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{message}</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
