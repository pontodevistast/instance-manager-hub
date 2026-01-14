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

export async function listGHLMenuLinks(token: string) {
    const url = 'https://services.leadconnectorhq.com/custom-menu-link/';

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28'
        }
    });

    if (!response.ok) {
        throw new Error(`Erro ao listar menus GHL: ${response.statusText}`);
    }

    return response.json();
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
        showToAllLocations: false,
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

export async function listGHLUsers(token: string, locationId: string) {
    const url = `https://services.leadconnectorhq.com/users/?locationId=${locationId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28'
        }
    });

    if (!response.ok) {
        throw new Error(`Erro ao listar usuários GHL: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('GHL Users Response:', data);

    // API v2 can return an array directly or an object with a 'users' property
    if (Array.isArray(data)) {
        return data;
    }

    return data.users || [];
}
