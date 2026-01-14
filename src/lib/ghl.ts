/**
 * GoHighLevel API Utilities
 */

interface GHLMenuLinkOptions {
    title: string;
    url: string;
    icon?: string;
    openMode?: 'iframe' | 'newTab' | 'currentWindow';
    showOnCompany?: boolean;
    showOnLocation?: boolean;
}

export async function createGHLMenuLink(
    token: string,
    options: GHLMenuLinkOptions
) {
    const url = 'https://services.leadconnectorhq.com/custom-menu-link/';

    const body = {
        title: options.title,
        url: options.url,
        icon: options.icon || 'phone',
        openMode: options.openMode || 'iframe',
        showOnCompany: options.showOnCompany ?? false,
        showOnLocation: options.showOnLocation ?? true,
        showToAllLocations: false, // Defaulting to the current location implicit in the token or specific to the user's intent
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28' // GHL API Version
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let errorMsg = `Erro no GHL: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || JSON.stringify(errorData) || errorMsg;
        } catch (e) {
            const text = await response.text().catch(() => '');
            if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
    }

    return response.json();
}
