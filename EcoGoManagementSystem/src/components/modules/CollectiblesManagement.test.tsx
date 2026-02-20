import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom';
import { CollectiblesManagement } from './CollectiblesManagement';
import * as collectiblesApi from '@/api/collectiblesApi';

// Mock the API module
vi.mock('@/api/collectiblesApi', () => ({
    getAllBadgeItems: vi.fn(),
    getAllClothItems: vi.fn(),
    getBadgePurchaseStats: vi.fn(),
    updateBadge: vi.fn(),
    deleteBadge: vi.fn(),
    createBadge: vi.fn(),
}));

// Mock ImageWithFallback since it might use actual Image loading
vi.mock('@/components/figma/ImageWithFallback', () => ({
    ImageWithFallback: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="image-fallback" />,
}));

describe('CollectiblesManagement Component', () => {
    const mockBadges = [
        {
            badgeId: 'badge1',
            name: { en: 'Badge 1', zh: '徽章1' },
            description: { en: 'Desc 1', zh: '描述1' },
            subCategory: 'normal',
            acquisitionMethod: 'purchase',
            purchaseCost: 100,
            icon: { colorScheme: '#000' },
        },
    ];

    const mockClothes = [
        {
            badgeId: 'cloth1',
            name: { en: 'Hat 1', zh: '帽子1' },
            description: { en: 'Desc Hat', zh: '描述帽子' },
            subCategory: 'head',
            acquisitionMethod: 'purchase',
            purchaseCost: 200,
            icon: { url: 'http://example.com/hat.png' },
        },
    ];

    const mockStats = [
        { badgeId: 'badge1', purchaseCount: 10 },
        { badgeId: 'cloth1', purchaseCount: 5 },
    ];

    beforeAll(() => {
        // Mock PointerCapture methods which are missing in JSDOM but used by Radix UI
        window.HTMLElement.prototype.hasPointerCapture = vi.fn();
        window.HTMLElement.prototype.setPointerCapture = vi.fn();
        window.HTMLElement.prototype.releasePointerCapture = vi.fn();
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        globalThis.ResizeObserver = class ResizeObserver {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        (collectiblesApi.getAllBadgeItems as any).mockReturnValue(new Promise(() => { }));
        (collectiblesApi.getAllClothItems as any).mockReturnValue(new Promise(() => { }));
        (collectiblesApi.getBadgePurchaseStats as any).mockReturnValue(new Promise(() => { }));

        // The component might not show a full page loader but just "Loading..." text or similar?
        // Looking at source: 
        // if (loading) return null or spinner?
        // Actually the source renders the main structure and state `loading` is true.
        // Lines 137-140 define state.
        // Line 189 `loadData` sets loading=true.
        // Logic: The component does NOT have an early return for loading. It renders Header -> Stats -> Tabs.
        // So we should check for "Collectibles Management" title.
        render(<CollectiblesManagement />);
        expect(screen.getByText('Collectibles Management')).toBeInTheDocument();
    });

    it('renders badges and clothes after loading', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(mockBadges);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue(mockClothes);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue(mockStats);

        render(<CollectiblesManagement />);

        await waitFor(() => {
            expect(screen.getByText('Badge 1')).toBeInTheDocument();
        });

        // Switch to Accessories tab
        const user = userEvent.setup();
        const clothesTab = screen.getByText('Pet Clothes Store');
        await user.click(clothesTab);

        await waitFor(() => {
            expect(screen.getByText('Hat 1')).toBeInTheDocument();
        });
    });

    it('creates a new badge', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(mockBadges);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue(mockClothes);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue(mockStats);
        (collectiblesApi.createBadge as any).mockResolvedValue({});

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        await waitFor(() => expect(screen.getByText('Badge 1')).toBeInTheDocument());

        const addBtn = screen.getByText('Add Badge');
        await user.click(addBtn);

        // Dialog opens - fill minimal required fields so button is enabled
        await user.type(screen.getByLabelText('Badge ID *'), 'new_badge');
        await user.type(screen.getByLabelText('Name (English) *'), 'New Badge EN');

        const createBtn = screen.getByRole('button', { name: 'Create Badge' }); // In footer
        await user.click(createBtn);

        await waitFor(() => {
            expect(collectiblesApi.createBadge).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it('deletes a badge', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(mockBadges);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue(mockClothes);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue(mockStats);
        (collectiblesApi.deleteBadge as any).mockResolvedValue({});

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        await waitFor(() => expect(screen.getByText('Badge 1')).toBeInTheDocument());

        // Find the card containing "Badge 1"
        const badgeTitle = screen.getByText('Badge 1');
        const badgeCard = badgeTitle.closest('[data-slot="card"]') as HTMLElement | null;
        expect(badgeCard).toBeTruthy();

        const buttons = within(badgeCard as HTMLElement).getAllByRole('button');
        // In the card, first button is "Edit", second is delete icon-only button
        await user.click(buttons[1]);

        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

        const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' }); // In confirm dialog
        await user.click(confirmDeleteBtn);

        await waitFor(() => {
            expect(collectiblesApi.deleteBadge).toHaveBeenCalledWith('badge1');
        });
    });

    it('handles load error', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockRejectedValue(new Error('API Error'));
        (collectiblesApi.getAllClothItems as any).mockResolvedValue([]);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue([]);

        render(<CollectiblesManagement />);

        await waitFor(() => {
            expect(screen.getByText('API Error')).toBeInTheDocument();
        });
    });

    it('edits a badge', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(mockBadges);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue(mockClothes);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue(mockStats);

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        await waitFor(() => expect(screen.getByText('Badge 1')).toBeInTheDocument());

        const badgeTitle = screen.getByText('Badge 1');
        const badgeCard = badgeTitle.closest('[data-slot="card"]') as HTMLElement;
        const editBtn = within(badgeCard).getByRole('button', { name: /Edit/i });

        await user.click(editBtn);

        const dialog = await screen.findByRole('dialog');
        const nameInput = within(dialog).getByDisplayValue('Badge 1');
        await user.clear(nameInput);
        await user.type(nameInput, 'Badge 1 Updated');

        const saveBtn = within(dialog).getByRole('button', { name: 'Save Changes' });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(screen.getByText('Badge 1 Updated')).toBeInTheDocument();
        });
    });

    it('filters badges by category and method', async () => {
        const badgesWithVariations = [
            ...mockBadges,
            { ...mockBadges[0], badgeId: 'badge2', name: { en: 'VIP Badge' }, subCategory: 'VIP', acquisitionMethod: 'vip' }
        ];
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(badgesWithVariations);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue([]);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue([]);

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        await waitFor(() => expect(screen.getByText('Badge 1')).toBeInTheDocument());
        expect(screen.getByText('VIP Badge')).toBeInTheDocument();

        // Filter by Method: VIP
        // Find the Select trigger for Method. It's the 3rd select on the page (Search input is not a select, so 2nd select?)
        // The selects are: 1. Category, 2. Acquisition Method
        // We can find by label if structure supports it, or use GetAllByRole('combobox').

        // Wait for select trigger to be available
        const triggers = await screen.findAllByRole('combobox');
        // Index 2 because: 0 might be existing selects from Tabs or something? 
        // Let's check the code:
        // TabsList doesn't use select.
        // Filters section has:
        // So it should be index 1 (0-based) if in Badge tab.

        const methodTrigger = triggers[1];

        // Radix UI Select trigger needs pointer down
        fireEvent.pointerDown(methodTrigger, { buttons: 1 });
        await user.click(methodTrigger);

        // Wait for dropdown content and find option by role
        const vipOption = await screen.findByRole('option', { name: /VIP Exclusive/i });
        await user.click(vipOption);

        await waitFor(() => {
            // Check that filtering applied
            // Since Badge 1 is 'purchase', and we selected VIP, Badge 1 should disappear
            expect(screen.queryByText('Badge 1')).not.toBeInTheDocument();
            // 'VIP Badge' should be present
            expect(screen.getByText('VIP Badge')).toBeInTheDocument();
        });
    });

    it('searches badges', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue(mockBadges);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue([]);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue([]);

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        await waitFor(() => expect(screen.getByText('Badge 1')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Enter badge ID...');
        await user.type(searchInput, 'badge1');

        // should still show
        expect(screen.getByText('Badge 1')).toBeInTheDocument();

        await user.clear(searchInput);
        await user.type(searchInput, 'nonexistent');

        await waitFor(() => {
            expect(screen.queryByText('Badge 1')).not.toBeInTheDocument();
        });
    });

    it('creates and edits an accessory', async () => {
        (collectiblesApi.getAllBadgeItems as any).mockResolvedValue([]);
        (collectiblesApi.getAllClothItems as any).mockResolvedValue(mockClothes);
        (collectiblesApi.getBadgePurchaseStats as any).mockResolvedValue([]);
        (collectiblesApi.createBadge as any).mockResolvedValue({});

        const user = userEvent.setup();
        render(<CollectiblesManagement />);

        const clothesTab = screen.getByText('Pet Clothes Store');
        await user.click(clothesTab);

        await waitFor(() => expect(screen.getByText('Hat 1')).toBeInTheDocument());

        // Create
        const addBtn = screen.getByText('Add Accessory');
        await user.click(addBtn);

        await user.type(screen.getByLabelText('Accessory ID *'), 'new_hat');
        await user.type(screen.getByLabelText('Name (English) *'), 'New Hat');

        const createBtn = screen.getByRole('button', { name: 'Create Accessory' });
        await user.click(createBtn);

        await waitFor(() => expect(collectiblesApi.createBadge).toHaveBeenCalled());

        // Edit existing
        const card = screen.getByText('Hat 1').closest('[data-slot="card"]') as HTMLElement;
        const editBtn = within(card).getByRole('button', { name: /Edit/i });
        await user.click(editBtn);

        const dialog = await screen.findByRole('dialog');
        const nameInput = within(dialog).getByDisplayValue('Hat 1');
        await user.type(nameInput, ' Edited');
        await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

        await waitFor(() => expect(screen.getByText('Hat 1 Edited')).toBeInTheDocument());
    });
});
