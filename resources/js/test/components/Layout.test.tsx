import Layout from '@/components/Layout';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Toaster component
vi.mock('@/components/ui/sonner', () => ({
    Toaster: () => <div data-testid="toaster" />,
}));

describe('Layout', () => {
    beforeEach(() => {
        // Mock any necessary globals
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders children correctly', () => {
        render(
            <Layout>
                <div data-testid="test-content">Test Content</div>
            </Layout>,
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders header with logo and navigation', () => {
        render(<Layout>Content</Layout>);

        // Check logo
        expect(screen.getByText('F')).toBeInTheDocument();
        expect(screen.getByText('FuckingFast')).toBeInTheDocument();

        // Check navigation links
        expect(screen.getByText('Upload')).toBeInTheDocument();
        expect(screen.getByText('Features')).toBeInTheDocument();
        expect(screen.getByText('API')).toBeInTheDocument();
    });

    it('renders mobile menu button', () => {
        render(<Layout>Content</Layout>);

        const mobileMenuButton = screen.getByLabelText('Open mobile menu');
        expect(mobileMenuButton).toBeInTheDocument();
        expect(mobileMenuButton).toHaveClass('md:hidden');
    });

    it('renders footer with brand information', () => {
        render(<Layout>Content</Layout>);

        expect(screen.getByText('Blazing fast, privacy-first file hosting. No registration, no tracking, no bullshit.')).toBeInTheDocument();
    });

    it('renders footer features section', () => {
        render(<Layout>Content</Layout>);

        expect(screen.getByText('Features')).toBeInTheDocument();
        expect(screen.getByText('• Up to 10GB file uploads')).toBeInTheDocument();
        expect(screen.getByText('• Zero speed limits')).toBeInTheDocument();
        expect(screen.getByText('• Complete privacy')).toBeInTheDocument();
        expect(screen.getByText('• No registration required')).toBeInTheDocument();
        expect(screen.getByText('• Cryptographic security')).toBeInTheDocument();
    });

    it('renders footer developer section', () => {
        render(<Layout>Content</Layout>);

        expect(screen.getByText('Developer')).toBeInTheDocument();
        expect(screen.getByText('• RESTful API')).toBeInTheDocument();
        expect(screen.getByText('• curl integration')).toBeInTheDocument();
        expect(screen.getByText('• No authentication')).toBeInTheDocument();
        expect(screen.getByText('• JSON responses')).toBeInTheDocument();
        expect(screen.getByText('• Rate limiting')).toBeInTheDocument();
    });

    it('renders footer copyright section', () => {
        render(<Layout>Content</Layout>);

        expect(screen.getByText('Built with Laravel & React. Privacy-first, speed-focused file hosting.')).toBeInTheDocument();
    });

    it('includes Toaster component', () => {
        render(<Layout>Content</Layout>);

        expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });

    it('applies dark theme classes', () => {
        const { container } = render(<Layout>Content</Layout>);

        const mainDiv = container.firstChild as HTMLElement;
        expect(mainDiv).toHaveClass('dark', 'min-h-screen', 'bg-background', 'text-foreground');
    });

    it('has correct header styling', () => {
        render(<Layout>Content</Layout>);

        const header = screen.getByRole('banner');
        expect(header).toHaveClass('border-b', 'border-border', 'bg-card');
    });

    it('has correct main content structure', () => {
        render(<Layout>Content</Layout>);

        const main = screen.getByRole('main');
        expect(main).toHaveClass('flex-1');
        expect(main).toHaveTextContent('Content');
    });

    it('has correct footer styling', () => {
        render(<Layout>Content</Layout>);

        const footer = screen.getByRole('contentinfo');
        expect(footer).toHaveClass('mt-auto', 'border-t', 'border-border', 'bg-card');
    });

    it('has responsive navigation classes', () => {
        render(<Layout>Content</Layout>);

        const nav = screen.getByRole('navigation');
        expect(nav).toHaveClass('hidden', 'md:flex');
    });

    it('has responsive footer grid', () => {
        render(<Layout>Content</Layout>);

        const footerGrid = screen.getByText('Features').closest('.grid');
        expect(footerGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });

    it('has correct navigation link attributes', () => {
        render(<Layout>Content</Layout>);

        const uploadLink = screen.getByText('Upload').closest('a');
        expect(uploadLink).toHaveAttribute('href', '/');

        const featuresLink = screen.getByText('Features').closest('a');
        expect(featuresLink).toHaveAttribute('href', '#features');

        const apiLink = screen.getByText('API').closest('a');
        expect(apiLink).toHaveAttribute('href', '#api');
    });

    it('has gradient styling on logo and brand text', () => {
        render(<Layout>Content</Layout>);

        const logoBackground = screen.getByText('F').closest('div');
        expect(logoBackground).toHaveClass('bg-gradient-primary');

        const brandTexts = screen.getAllByText('FuckingFast');
        brandTexts.forEach((text) => {
            expect(text).toHaveClass('gradient-primary-text');
        });
    });

    it('has proper hover states on navigation links', () => {
        render(<Layout>Content</Layout>);

        const navLinks = [screen.getByText('Upload'), screen.getByText('Features'), screen.getByText('API')];

        navLinks.forEach((link) => {
            expect(link).toHaveClass('text-muted-foreground', 'transition-colors', 'hover:text-foreground');
        });
    });

    it('has proper mobile menu button styling', () => {
        render(<Layout>Content</Layout>);

        const mobileButton = screen.getByLabelText('Open mobile menu');
        expect(mobileButton).toHaveClass('rounded-md', 'p-2', 'hover:bg-secondary', 'md:hidden');
    });

    it('renders SVG icon in mobile menu button', () => {
        render(<Layout>Content</Layout>);

        const mobileButton = screen.getByLabelText('Open mobile menu');
        const svg = mobileButton.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('h-6', 'w-6');
        expect(svg).toHaveAttribute('fill', 'none');
        expect(svg).toHaveAttribute('stroke', 'currentColor');
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('has correct container classes', () => {
        render(<Layout>Content</Layout>);

        const containers = screen.getAllByText('FuckingFast')[0].closest('.container');
        expect(containers).toHaveClass('container', 'mx-auto', 'px-4');
    });

    it('uses default title when none provided', () => {
        render(<Layout>Content</Layout>);

        // The title prop is not used in the component, but we can test that it accepts it
        expect(screen.getByText('FuckingFast')).toBeInTheDocument();
    });

    it('accepts custom title prop', () => {
        render(<Layout title="Custom Title">Content</Layout>);

        // The title prop is accepted but not rendered in the component
        expect(screen.getByText('FuckingFast')).toBeInTheDocument();
    });

    it('has proper spacing and layout classes', () => {
        render(<Layout>Content</Layout>);

        // Check header spacing
        const headerContainer = screen.getByText('FuckingFast').closest('.py-4');
        expect(headerContainer).toHaveClass('py-4');

        // Check footer spacing
        const footerContainer = screen.getByText('Built with Laravel & React. Privacy-first, speed-focused file hosting.').closest('.py-8');
        expect(footerContainer).toHaveClass('py-8');
    });

    it('has proper text styling classes', () => {
        render(<Layout>Content</Layout>);

        // Check muted text styling
        const mutedTexts = screen.getAllByText(/text-muted-foreground/);
        const descriptionText = screen.getByText('Blazing fast, privacy-first file hosting. No registration, no tracking, no bullshit.');
        expect(descriptionText).toHaveClass('text-sm', 'text-muted-foreground');
    });
});
